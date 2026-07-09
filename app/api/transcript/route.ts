import { z } from "zod";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { withSecurity } from "@/lib/security/middleware";
import { getCachedAnalysis, upsertTranscriptCache } from "@/lib/supabase/cache";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";
import { VideoIdSchema } from "@/lib/youtube/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";

const RequestSchema = z.object({
  videoId: VideoIdSchema
});

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 64 * 1024,
    scope: "transcript",
    rateLimit: { maxRequests: 12, windowMs: 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const cached = await getCachedAnalysis(parsed.data.videoId);
  if (cached?.transcript) {
    return successResponse({ videoId: parsed.data.videoId, transcript: cached.transcript, cached: true });
  }

  try {
    const [metadata, transcript] = await Promise.all([
      fetchYouTubeMetadata(parsed.data.videoId),
      getTranscriptProvider().getTranscript(parsed.data.videoId)
    ]);
    await upsertTranscriptCache({ videoId: parsed.data.videoId, metadata, transcript });
    return successResponse({ videoId: parsed.data.videoId, transcript, cached: false });
  } catch (error) {
    console.error("Transcript loading failed", error);
    const message =
      error instanceof Error
        ? `转录获取失败：${error.message}`
        : "No transcript could be loaded for this video.";
    return errorResponse("transcript_unavailable", message, 502);
  });
}
