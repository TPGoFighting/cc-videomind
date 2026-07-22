import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";
import { withChatDegradation, buildDegradedResponse } from "@/lib/ai/degradation";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { getCachedAnalysis, upsertTranscriptCache } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { VideoIdSchema } from "@/lib/youtube/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";
import { selectChatEvidence, validateChatCitations } from "@/lib/product/chat-evidence";

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

    const evidence = selectChatEvidence(parsed.data.question, transcript);
    if (!evidence.found) {
      return successResponse({
        answer: "无法从这段视频字幕中证实这个问题。请换一种问法，或回到视频中的具体术语、人物或时间点。",
        citations: [],
      });
    }

    const aiProvider = await getAiProvider(userId ?? undefined);
    const t0 = Date.now();

    const degradedResult = await withChatDegradation(
      () => aiProvider.answerQuestion({ question: parsed.data.question, transcript: evidence.segments }),
    );

    if (degradedResult.level === "degraded") {
      throw degradedResult.originalError ?? new Error("AI chat is unavailable.");
    }

    const fallbackAnswer = { answer: "暂时无法回答，请稍后再试。", citations: [] };
    const { data: answer = fallbackAnswer } = buildDegradedResponse(degradedResult, fallbackAnswer);
    const citations = validateChatCitations(answer.citations, evidence.segments);
    const verifiedAnswer = citations.length > 0
      ? { ...answer, citations }
      : { answer: "模型没有返回可在原字幕中核验的引用，因此无法从视频证实这个回答。", citations: [] };
    recordAiCall({
      provider: "default", model: "default", feature: "chat",
      inputTokens: Math.ceil(transcript.length * 50 / 4),
      outputTokens: Math.ceil(JSON.stringify(verifiedAnswer).length / 4),
      elapsedMs: Date.now() - t0, success: true,
      userId: userId ?? undefined, videoId: parsed.data.videoId,
    });

    return successResponse(verifiedAnswer);
  } catch (error) {
    console.error("Chat answer failed", error);
    const providerFailure = getAiProviderFailure(error);
    if (providerFailure) {
      return errorResponse(providerFailure.code, providerFailure.message, providerFailure.status);
    }
    return errorResponse("chat_failed", "Question could not be answered from the transcript.", 502);
  }
  });
}
