import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getCachedAnalysis, upsertAnalysisCache } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { VideoIdSchema } from "@/lib/youtube/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";

const RequestSchema = z.object({
  videoId: VideoIdSchema
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request, "generate-summary"), 8, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many summary requests. Try again shortly.", 429);
  }

  const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const cached = await getCachedAnalysis(parsed.data.videoId);
    if (cached?.analysis) {
      return successResponse({
        summary: cached.analysis.summary,
        takeaways: cached.analysis.takeaways,
        cached: true
      });
    }

    const metadata = cached?.metadata ?? (await fetchYouTubeMetadata(parsed.data.videoId));
    const transcript = cached?.transcript ?? (await getTranscriptProvider().getTranscript(parsed.data.videoId));
    const analysis = await getAiProvider().generateAnalysis({ title: metadata.title, transcript });
    await upsertAnalysisCache({ videoId: parsed.data.videoId, metadata, transcript, analysis });

    return successResponse({
      summary: analysis.summary,
      takeaways: analysis.takeaways,
      cached: false
    });
  } catch {
    return errorResponse("summary_failed", "Summary could not be generated from the transcript.", 502);
  }
}
