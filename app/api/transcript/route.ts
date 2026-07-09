import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { getAuthenticatedUserId, hasUserAnalyzedVideo, checkAnalysisQuota, recordAnalysisUsage } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { extractYouTubeVideoId, VideoIdSchema } from "@/lib/youtube/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";

const RequestSchema = z
  .object({
    url: z.string().min(1).max(500).optional(),
    videoId: VideoIdSchema.optional()
  })
  .refine((value) => value.url || value.videoId, "url or videoId is required");

export const maxDuration = 120;

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 64 * 1024,
    scope: "transcript",
    rateLimit: { maxRequests: 12, windowMs: 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, RequestSchema);
    if (!parsed.ok) return parsed.response;

    let videoId = parsed.data.videoId ?? null;
    const urlInput = parsed.data.url?.trim() ?? "";
    let isBilibili = false;

    if (videoId) {
      isBilibili = /^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(videoId);
    } else if (urlInput) {
      isBilibili =
        urlInput.includes("bilibili.com") ||
        urlInput.includes("b23.tv") ||
        /^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(urlInput);

      if (isBilibili) {
        const { resolveBilibiliUrl, extractBilibiliVideoId } = await import("@/lib/bilibili/id");
        const resolvedUrl = await resolveBilibiliUrl(urlInput);
        videoId = extractBilibiliVideoId(resolvedUrl);
      } else {
        videoId = extractYouTubeVideoId(urlInput);
      }
    }

    if (!videoId) {
      return errorResponse("invalid_video_url", "Enter a valid public YouTube or Bilibili URL.", 400);
    }

    const userId = await getAuthenticatedUserId(request);

    // 检查缓存
    const cached = await getCachedAnalysis(videoId);
    if (cached?.metadata && cached.transcript) {
      const alreadyAnalyzed = await hasUserAnalyzedVideo(userId, videoId, request);
      if (alreadyAnalyzed) {
        return successResponse({
          videoId,
          metadata: cached.metadata,
          transcript: cached.transcript,
          cached: true,
        });
      }

      const quota = await checkAnalysisQuota(userId, request);
      if (!quota.allowed) {
        const msg = quota.anonymous
          ? "未登录仅限解析1条视频，请登录后继续使用。"
          : `配额已用完，请升级至 Pro 解锁更多配额。`;
        return errorResponse("quota_exceeded", msg, 402);
      }

      await recordAnalysisUsage({ userId, videoId, request });
      return successResponse({
        videoId,
        metadata: cached.metadata,
        transcript: cached.transcript,
        cached: true,
      });
    }

    // 缓存未命中：获取元数据 + 字幕
    const quota = await checkAnalysisQuota(userId, request);
    if (!quota.allowed) {
      const msg = quota.anonymous
        ? "未登录仅限解析1条视频，请登录后继续使用。"
        : `配额已用完，请升级至 Pro 解锁更多配额。`;
      return errorResponse("quota_exceeded", msg, 402);
    }

    try {
      const fetchMeta = async () => {
        if (cached?.metadata) return cached.metadata;
        if (isBilibili) {
          const { fetchBilibiliMetadata } = await import("@/lib/bilibili/metadata");
          const bilibiliMeta = await fetchBilibiliMetadata(videoId!);
          return {
            videoId: bilibiliMeta.videoId,
            title: bilibiliMeta.title,
            authorName: bilibiliMeta.authorName,
            thumbnailUrl: bilibiliMeta.thumbnailUrl,
            providerUrl: bilibiliMeta.providerUrl
          };
        }
        return fetchYouTubeMetadata(videoId!);
      };

      const fetchTrans = async () => {
        if (cached?.transcript) return cached.transcript;
        if (isBilibili) {
          const { BilibiliTranscriptProvider } = await import("@/lib/bilibili/transcript-provider");
          return new BilibiliTranscriptProvider().getTranscript(videoId!);
        }
        return getTranscriptProvider().getTranscript(videoId!);
      };

      const [metadata, transcript] = await Promise.all([fetchMeta(), fetchTrans()]);

      // Fire-and-forget: async vectorize (non-blocking)
      if (userId && Array.isArray(transcript) && transcript.length) {
        import("@/lib/async/task-manager")
          .then(({ createTask }) =>
            createTask("vectorize", videoId!, userId, { videoId, title: metadata.title })
          )
          .catch(() => {});
      }

      return successResponse({
        videoId,
        metadata,
        transcript,
        cached: false,
      });
    } catch (error) {
      console.error("Transcript fetch failed", error);
      const message =
        error instanceof Error
          ? `字幕获取失败：${error.message}`
          : "Could not fetch transcript from this video.";
      return errorResponse("transcript_failed", message, 502);
    }
  });
}
