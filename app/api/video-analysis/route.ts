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
  const quota = await checkAnalysisQuota(userId);
  if (!quota.allowed) {
    return errorResponse(
      "quota_exceeded",
      `Monthly analysis quota reached (${quota.used}/${quota.limit}).`,
      402
    );
  }

  try {
    const metadata = cached?.metadata ?? (await fetchYouTubeMetadata(videoId));
    const transcript = cached?.transcript ?? (await getTranscriptProvider().getTranscript(videoId));
    const analysis = await (await getAiProvider()).generateAnalysis({ title: metadata.title, transcript });

    await upsertAnalysisCache({ videoId, metadata, transcript, analysis });
    await recordAnalysisUsage({ userId, videoId });

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
