import { z } from "zod";
import { getAiProvider, type ChatAnswerWithDiagnostics } from "@/lib/ai/provider";
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
import { recordProductEventSafely } from "@/lib/product/analytics-store";

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

  const analyticsStartedAt = Date.now();
  let transcriptCacheHit = false;

  try {
    const cached = await getCachedAnalysis(parsed.data.videoId);
    transcriptCacheHit = Boolean(cached?.transcript);
    const transcript = cached?.transcript ?? (await getTranscriptProvider().getTranscript(parsed.data.videoId));
    if (!cached?.transcript) {
      const metadata = await fetchYouTubeMetadata(parsed.data.videoId);
      await upsertTranscriptCache({ videoId: parsed.data.videoId, metadata, transcript });
    }

    const evidence = selectChatEvidence(parsed.data.question, transcript);
    if (!evidence.found) {
      await recordProductEventSafely(userId, {
        name: "chat_completed",
        payload: {
          durationMs: Date.now() - analyticsStartedAt,
          transcriptCacheHit,
          modelMode: "not_called",
          outcome: "no_evidence",
          jsonParseMode: "not_called",
          citationNormalized: false,
        },
      });
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

    const fallbackAnswer: ChatAnswerWithDiagnostics = {
      answer: "暂时无法回答，请稍后再试。",
      citations: [],
      diagnostics: { jsonParseMode: "direct", citationNormalized: false },
    };
    const { data: answerWithDiagnostics = fallbackAnswer } = buildDegradedResponse(degradedResult, fallbackAnswer);
    const { diagnostics, ...answer } = answerWithDiagnostics;
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

    await recordProductEventSafely(userId, {
      name: "chat_completed",
      payload: {
        durationMs: Date.now() - analyticsStartedAt,
        transcriptCacheHit,
        modelMode: degradedResult.level === "cached" ? "cached" : degradedResult.level === "fallback" ? "fallback" : "primary",
        outcome: citations.length > 0 ? "grounded" : "citation_unverified",
        jsonParseMode: diagnostics.jsonParseMode,
        citationNormalized: diagnostics.citationNormalized,
      },
    });

    return successResponse(verifiedAnswer);
  } catch (error) {
    console.error("Chat answer failed", error);
    const providerFailure = getAiProviderFailure(error);
    await recordProductEventSafely(userId, {
      name: "chat_failed",
      payload: {
        durationMs: Date.now() - analyticsStartedAt,
        transcriptCacheHit,
        errorCode: providerFailure?.code ?? "chat_failed",
      },
    });
    if (providerFailure) {
      return errorResponse(providerFailure.code, providerFailure.message, providerFailure.status);
    }
    return errorResponse("chat_failed", "Question could not be answered from the transcript.", 502);
  }
  });
}
