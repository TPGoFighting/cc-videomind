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
import { retrieveRelevantChunks, type RetrievedChunk } from "@/lib/embedding/retriever";
import type { TranscriptSegment } from "@/lib/types";

const RequestSchema = z.object({
  videoId: VideoIdSchema,
  question: z.string().min(3).max(800)
});

function chunksToSegments(chunks: RetrievedChunk[]): TranscriptSegment[] {
  // Build minimal TranscriptSegment[] from retrieved chunks for the provider
  const segments: { startTime: number; endTime: number; text: string }[] = [];
  for (const c of chunks) {
    // Use segment range as a synthetic timestamp reference
    // The actual timestamps aren't available from chunks, so we use segment indices * 10 as rough estimates
    segments.push({
      startTime: c.segmentStart * 10,
      endTime: (c.segmentEnd + 1) * 10,
      text: c.text,
    });
  }
  return segments;
}

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

    // RAG retrieval: try vector search first, fall back to full transcript
    let ragChunks: RetrievedChunk[] = [];
    try {
      ragChunks = await retrieveRelevantChunks(parsed.data.videoId, parsed.data.question, 5);
    } catch {
      // Vector search failed (e.g. no chunks vectorized yet) — fall back silently
    }

    const aiProvider = await getAiProvider(userId ?? undefined);
    const t0 = Date.now();

    let degradedResult;
    if (ragChunks.length > 0) {
      // RAG mode: use retrieved chunks as context
      const segmentsFromChunks = chunksToSegments(ragChunks);
      degradedResult = await withChatDegradation(
        () => aiProvider.answerQuestion({
          question: parsed.data.question,
          transcript: segmentsFromChunks,
          chunks: ragChunks,
        }),
      );
    } else {
      // Fallback: existing behavior with full transcript
      degradedResult = await withChatDegradation(
        () => aiProvider.answerQuestion({ question: parsed.data.question, transcript }),
      );
    }

    if (degradedResult.level === "degraded") {
      throw degradedResult.originalError ?? new Error("AI chat is unavailable.");
    }

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
    const providerFailure = getAiProviderFailure(error);
    if (providerFailure) {
      return errorResponse(providerFailure.code, providerFailure.message, providerFailure.status);
    }
    return errorResponse("chat_failed", "Question could not be answered from the transcript.", 502);
  }
  });
}
