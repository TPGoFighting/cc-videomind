import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { getCachedAnalysis, upsertTranscriptCache } from "@/lib/supabase/cache";
import { getAuthenticatedUserId, hasUserAnalyzedVideo, checkAnalysisQuota, recordAnalysisUsage } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { extractYouTubeVideoId } from "@/lib/youtube/id";
import {
  extractBilibiliVideoId,
  isBilibiliImportedVideoId,
  isBilibiliVideoId,
} from "@/lib/bilibili/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider, TranscriptError } from "@/lib/youtube/transcript-provider";
import { ExternalServiceError } from "@/lib/utils/http";
import { recordProductEventSafely } from "@/lib/product/analytics-store";
import { isLocalMode } from "@/lib/local-mode";

const RequestSchema = z
  .object({
    url: z.string().min(1).max(500).optional(),
    videoId: z.string().min(6).max(64).optional()
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
    let isDirectBilibili = false;
    let isImportedBilibili = false;

    if (videoId) {
      isDirectBilibili = isBilibiliVideoId(videoId);
      isImportedBilibili = isBilibiliImportedVideoId(videoId);
    } else if (urlInput) {
      isDirectBilibili =
        urlInput.includes("bilibili.com") ||
        urlInput.includes("b23.tv") ||
        /^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(urlInput);

      if (isDirectBilibili) {
        videoId = extractBilibiliVideoId(urlInput);
      } else {
        videoId = extractYouTubeVideoId(urlInput);
      }
    }

    if (!videoId) {
      return errorResponse("invalid_video_url", "Enter a valid public YouTube or Bilibili URL.", 400);
    }

    if (isDirectBilibili) {
      return errorResponse(
        "bilibili_subtitle_import_required",
        "B 站视频请导入 SRT、VTT 或 B 站 JSON 字幕后开始学习；我们不会自动提取公开视频音频。",
        422,
      );
    }

    const userId = await getAuthenticatedUserId(request);
    if (isImportedBilibili) {
      if (!userId) {
        return errorResponse("unauthorized", "登录后才能打开你导入的 B 站字幕。", 401);
      }
      const ownsWorkspace = isLocalMode() || await hasUserAnalyzedVideo(userId, videoId, request);
      if (!ownsWorkspace) {
        return errorResponse("workspace_not_found", "找不到这份导入字幕，或你没有访问权限。", 404);
      }
      const imported = await getCachedAnalysis(videoId);
      if (!imported?.metadata || !imported.transcript) {
        return errorResponse("workspace_not_found", "这份导入字幕已不可用，请重新导入。", 404);
      }
      return successResponse({ videoId, metadata: imported.metadata, transcript: imported.transcript, cached: true });
    }

    const analyticsUserId = userId;
    const analyticsStartedAt = Date.now();
    await recordProductEventSafely(analyticsUserId, {
      name: "video_parse_started",
      payload: { source: "youtube" },
    });

    // 检查缓存
    const cached = await getCachedAnalysis(videoId);
    if (cached?.metadata && cached.transcript) {
      const alreadyAnalyzed = await hasUserAnalyzedVideo(userId, videoId, request);
      if (alreadyAnalyzed) {
        await recordProductEventSafely(analyticsUserId, {
          name: "video_parse_completed",
          payload: { source: "youtube", durationMs: Date.now() - analyticsStartedAt, cacheHit: true },
        });
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
        await recordProductEventSafely(analyticsUserId, {
          name: "video_parse_failed",
          payload: { source: "youtube", durationMs: Date.now() - analyticsStartedAt, errorCode: "quota_exceeded" },
        });
        return errorResponse("quota_exceeded", msg, 402);
      }

      await recordAnalysisUsage({ userId, videoId, request });
      await recordProductEventSafely(analyticsUserId, {
        name: "video_parse_completed",
        payload: { source: "youtube", durationMs: Date.now() - analyticsStartedAt, cacheHit: true },
      });
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
      await recordProductEventSafely(analyticsUserId, {
        name: "video_parse_failed",
        payload: { source: "youtube", durationMs: Date.now() - analyticsStartedAt, errorCode: "quota_exceeded" },
      });
      return errorResponse("quota_exceeded", msg, 402);
    }

    try {
      const fetchMeta = async () => {
        if (cached?.metadata) return cached.metadata;
        return fetchYouTubeMetadata(videoId!);
      };

      const fetchTrans = async () => {
        if (cached?.transcript) return cached.transcript;
        return getTranscriptProvider().getTranscript(videoId!);
      };

      const [metadata, transcript] = await Promise.all([fetchMeta(), fetchTrans()]);

      // Persist as soon as the expensive provider work succeeds. This gives
      // every later user a shared transcript hit even before AI analysis ends.
      try {
        await upsertTranscriptCache({ videoId, metadata, transcript });
      } catch (cacheError) {
        console.warn("[Transcript] Shared cache write failed:", cacheError);
      }

      // Pseudo embeddings are not a production retrieval signal. Chat uses
      // timestamped transcript evidence directly until a real embedding path
      // has an evaluated provider and migration plan.

      await recordProductEventSafely(analyticsUserId, {
        name: "video_parse_completed",
        payload: { source: "youtube", durationMs: Date.now() - analyticsStartedAt, cacheHit: false },
      });
      return successResponse({
        videoId,
        metadata,
        transcript,
        cached: false,
      });
    } catch (error) {
      console.error("Transcript fetch failed", error);
      const code =
        error instanceof TranscriptError
          ? error.code
          : error instanceof ExternalServiceError
            ? "metadata_unavailable"
            : "transcript_failed";
      const message =
        error instanceof TranscriptError
          ? error.message
          : error instanceof ExternalServiceError
            ? "无法获取视频元数据，请检查网络后重试。"
            : "暂时无法获取视频字幕，请稍后重试。";
      await recordProductEventSafely(analyticsUserId, {
        name: "video_parse_failed",
        payload: { source: "youtube", durationMs: Date.now() - analyticsStartedAt, errorCode: code },
      });
      return errorResponse(code, message, 502);
    }
  });
}
