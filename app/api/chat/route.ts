import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getCachedAnalysis, upsertTranscriptCache } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { VideoIdSchema } from "@/lib/youtube/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";

const RequestSchema = z.object({
  videoId: VideoIdSchema,
  question: z.string().min(3).max(800)
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request, "chat"), 20, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many chat requests. Try again shortly.", 429);
  }

  const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const cached = await getCachedAnalysis(parsed.data.videoId);
    const transcript = cached?.transcript ?? (await getTranscriptProvider().getTranscript(parsed.data.videoId));
    if (!cached?.transcript) {
      const metadata = await fetchYouTubeMetadata(parsed.data.videoId);
      await upsertTranscriptCache({ videoId: parsed.data.videoId, metadata, transcript });
    }

    const answer = await (await getAiProvider()).answerQuestion({
      question: parsed.data.question,
      transcript
    });

    return successResponse(answer);
  } catch (error) {
    console.error("Chat answer failed", error);
    return errorResponse("chat_failed", "Question could not be answered from the transcript.", 502);
  }
}
