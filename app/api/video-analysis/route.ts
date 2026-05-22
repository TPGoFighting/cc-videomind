import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getCachedAnalysis, upsertAnalysisCache } from "@/lib/supabase/cache";
import { checkAnalysisQuota, getAuthenticatedUserId, hasUserAnalyzedVideo, recordAnalysisUsage } from "@/lib/supabase/quota";
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

function buildQuotaMessage(quota: {
  tier?: string;
  dailyLimit?: number;
  weeklyLimit?: number;
  dailyUsed?: number;
  weeklyUsed?: number;
  totalLimit?: number;
  totalUsed?: number;
}) {
  const tier = quota.tier ?? "free";

  // 免费版：总计额度，不重置
  if (tier === "free" && quota.totalLimit !== undefined) {
    return `总计解析次数已达上限（${quota.totalLimit}次），请升级至 Pro 或 Max 解锁更多配额。`;
  }

  const dailyLimit = quota.dailyLimit ?? 10;
  const weeklyLimit = quota.weeklyLimit ?? Infinity;
  const dailyUsed = quota.dailyUsed ?? 0;

  const dailyExceeded = dailyUsed >= dailyLimit;

  const limitDesc = dailyExceeded
    ? `今日已达上限（${dailyLimit}次/天）`
    : `本周已达上限（${weeklyLimit}次/周）`;

  const upgradeHint =
    tier === "pro"
      ? "请升级至 Max 解锁更多配额。"
      : "如需更多配额，请联系技术支持。";

  return `${limitDesc}，${upgradeHint}`;
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request, "video-analysis"), 8, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many analysis requests. Try again shortly.", 429);
  }

  const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const videoId = parsed.data.videoId ?? (parsed.data.url ? extractYouTubeVideoId(parsed.data.url) : null);
  if (!videoId) {
    return errorResponse("invalid_video_url", "Enter a valid public YouTube URL.", 400);
  }

  const userId = await getAuthenticatedUserId(request);
  const cached = await getCachedAnalysis(videoId);

  // 缓存命中：检查当前用户是否已解析过此视频
  if (cached?.metadata && cached.transcript && cached.analysis) {
    const alreadyAnalyzed = await hasUserAnalyzedVideo(userId, videoId, request);
    if (alreadyAnalyzed) {
      return successResponse({
        videoId,
        metadata: cached.metadata,
        transcript: cached.transcript,
        analysis: cached.analysis,
        cached: true,
        preview: false
      });
    }

    // 缓存命中但用户未解析过 → 仍需扣额度
    const quota = await checkAnalysisQuota(userId, request);
    if (!quota.allowed) {
      const msg = quota.anonymous
        ? "未登录仅限解析1条视频，请登录后继续使用。"
        : buildQuotaMessage(quota);
      return errorResponse("quota_exceeded", msg, 402);
    }

    await recordAnalysisUsage({ userId, videoId, request });

    return successResponse({
      videoId,
      metadata: cached.metadata,
      transcript: cached.transcript,
      analysis: cached.analysis,
      cached: true,
      preview: userId === null
    });
  }

  // 缓存未命中：走完整流程
  const quota = await checkAnalysisQuota(userId, request);
  if (!quota.allowed) {
    const msg = quota.anonymous
      ? "未登录仅限解析1条视频，请登录后继续使用。"
      : buildQuotaMessage(quota);
    return errorResponse("quota_exceeded", msg, 402);
  }

  try {
    const metadata = cached?.metadata ?? (await fetchYouTubeMetadata(videoId));
    const transcript = cached?.transcript ?? (await getTranscriptProvider().getTranscript(videoId));
    const analysis = await (await getAiProvider(userId ?? undefined)).generateAnalysis({ title: metadata.title, transcript });

    await upsertAnalysisCache({ videoId, metadata, transcript, analysis });
    await recordAnalysisUsage({ userId, videoId, request });

    return successResponse({
      videoId,
      metadata,
      transcript,
      analysis,
      cached: false,
      preview: userId === null
    });
  } catch (error) {
    console.error("Video analysis failed", error);
    const message =
      error instanceof Error
        ? `分析失败：${error.message}`
        : "Video analysis could not be generated from the transcript.";
    return errorResponse("analysis_failed", message, 502);
  }
}
