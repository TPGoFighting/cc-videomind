import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getCachedAnalysis, upsertAnalysisCache } from "@/lib/supabase/cache";
import { checkAnalysisQuota, getAuthenticatedUserId, recordAnalysisUsage } from "@/lib/supabase/quota";
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

function buildQuotaMessage(quota: { tier?: string; dailyLimit?: number; weeklyLimit?: number; dailyUsed?: number; weeklyUsed?: number }) {
  const tier = quota.tier ?? "free";
  const dailyLimit = quota.dailyLimit ?? 3;
  const weeklyLimit = quota.weeklyLimit ?? Infinity;
  const dailyUsed = quota.dailyUsed ?? 0;
  const weeklyUsed = quota.weeklyUsed ?? 0;

  const dailyExceeded = dailyUsed >= dailyLimit;
  const weeklyExceeded = weeklyUsed >= weeklyLimit;

  const limitDesc = dailyExceeded
    ? `今日已达上限（${dailyLimit}次/天）`
    : `本周已达上限（${weeklyLimit}次/周）`;

  const upgradeHint =
    tier === "free"
      ? "请升级至 Pro 或 Max 解锁更多配额。"
      : tier === "pro"
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

  const cached = await getCachedAnalysis(videoId);
  if (cached?.metadata && cached.transcript && cached.analysis) {
    return successResponse({
      videoId,
      metadata: cached.metadata,
      transcript: cached.transcript,
      analysis: cached.analysis,
      cached: true,
      preview: false
    });
  }

  const userId = await getAuthenticatedUserId(request);
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
    const analysis = await (await getAiProvider()).generateAnalysis({ title: metadata.title, transcript });

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
