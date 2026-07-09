import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { withChatDegradation, buildDegradedResponse } from "@/lib/ai/degradation";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
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
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 32 * 1024,
    scope: "chat",
    rateLimit: { maxRequests: 20, windowMs: 60_000 },
  }).wrap(request, async () => {
      const userId = await getAuthenticatedUserId(request);

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

    const aiProvider = await getAiProvider(userId ?? undefined);
    const t0 = Date.now();
    const degradedResult = await withChatDegradation(
      () => aiProvider.answerQuestion({ question: parsed.data.question, transcript }),
    );
    const { data: answer } = buildDegradedResponse(degradedResult, { answer: "暂时无法回答，请稍后再试。", citations: [] });
    recordAiCall({
      provider: "default", model: "default", feature: "chat",
      inputTokens: Math.ceil(transcript.length * 50 / 4),
      outputTokens: Math.ceil(JSON.stringify(answer).length / 4),
      elapsedMs: Date.now() - t0, success: true,
      userId: userId ?? undefined, videoId: parsed.data.videoId,
    });

    return successResponse(answer);
  } catch (error) {
    console.error("Chat answer failed", error);
    return errorResponse("chat_failed", "Question could not be answered from the transcript.", 502);
  }
  });
}
