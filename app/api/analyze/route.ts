import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";
import { withAnalysisDegradation, buildDegradedAnalysisResponse } from "@/lib/ai/degradation";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { withSecurity } from "@/lib/security/middleware";
import { getCachedAnalysis, upsertAnalysisCache } from "@/lib/supabase/cache";
import { getCachedComprehensive, upsertComprehensiveCache } from "@/lib/supabase/cache-v2";
import { getAuthenticatedUserId, recordAnalysisUsage } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { runSingleFlight } from "@/lib/utils/single-flight";
import { deriveComprehensiveFromAnalysis } from "@/lib/utils/comprehensive-cache";
import { hasReusableVideoAnalysis } from "@/lib/utils/video-analysis-cache";
import type { VideoMetadata } from "@/lib/types";

const TranscriptSegmentSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  text: z.string(),
  text_zh: z.string().optional(),
});

const RequestSchema = z.object({
  videoId: z.string().min(1).max(100),
  // The workspace sends only videoId after /api/transcript has persisted data.
  // These fields remain optional for backward compatibility with older clients.
  title: z.string().min(1).max(500).optional(),
  transcript: z.array(TranscriptSegmentSchema).min(1).max(10000).optional(),
});

export const maxDuration = 120;

function fallbackMetadata(videoId: string, title: string): VideoMetadata {
  return { videoId, title, authorName: "", thumbnailUrl: "", providerUrl: "" };
}

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 1024 * 1024,
    scope: "analyze",
    rateLimit: { maxRequests: 6, windowMs: 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, RequestSchema);
    if (!parsed.ok) return parsed.response;

    const { videoId } = parsed.data;
    const userId = await getAuthenticatedUserId(request);
    const cached = await getCachedAnalysis(videoId);

    // A complete shared cache is the normal fast path for repeat viewers.
    if (hasReusableVideoAnalysis(cached)) {
      let comprehensive = await getCachedComprehensive(videoId);
      if (!comprehensive) {
        comprehensive = deriveComprehensiveFromAnalysis(cached.analysis);
        try {
          await upsertComprehensiveCache({ videoId, result: comprehensive });
        } catch (cacheError) {
          console.warn("[Analyze] Historical comprehensive cache write failed:", cacheError);
        }
      }
      await recordAnalysisUsage({ userId, videoId, request });
      return successResponse({
        videoId,
        transcript: cached.transcript,
        analysis: cached.analysis,
        comprehensive,
        cached: true,
        preview: userId === null,
        degraded: false,
      });
    }

    const title = cached?.metadata?.title ?? parsed.data.title;
    const transcript = cached?.transcript ?? parsed.data.transcript;
    if (!title || !transcript) {
      return errorResponse("analysis_input_missing", "字幕尚未写入缓存，请刷新页面后重试。", 409);
    }
    const metadata = cached?.metadata ?? fallbackMetadata(videoId, title);

    try {
      const result = await runSingleFlight(`video-analysis:${videoId}`, async () => {
        // A second request may have finished while this request waited for the
        // single-flight slot, so always re-check the durable shared cache.
        const sharedCached = await getCachedAnalysis(videoId);
        if (hasReusableVideoAnalysis(sharedCached)) {
          return {
            transcript: sharedCached.transcript,
            analysis: sharedCached.analysis,
            cached: true,
            comprehensive: undefined,
            degraded: false,
            message: undefined,
          };
        }

        const aiProvider = await getAiProvider(userId ?? undefined);
        const t0 = Date.now();
        let comprehensiveData: Awaited<ReturnType<typeof aiProvider.generateComprehensiveAnalysis>> | null = null;
        let analysis: Awaited<ReturnType<typeof aiProvider.generateAnalysis>> | null = null;
        let degraded = false;
        let message: string | undefined;

        try {
          comprehensiveData = await aiProvider.generateComprehensiveAnalysis({ title, transcript });
          analysis = {
            summary: comprehensiveData.summary,
            takeaways: comprehensiveData.suggestedQuestions.slice(0, 8),
            suggestedQuestions: comprehensiveData.suggestedQuestions,
            highlights: comprehensiveData.highlights,
          };
          try {
            await upsertComprehensiveCache({ videoId, result: comprehensiveData });
          } catch (cacheError) {
            console.warn("[Analyze] Comprehensive cache write failed:", cacheError);
          }
        } catch (comprehensiveError) {
          console.warn("[Analyze] Comprehensive generation failed, falling back to basic analysis:", comprehensiveError);
          comprehensiveData = null;
          const degradedResult = await withAnalysisDegradation(
            () => aiProvider.generateAnalysis({ title, transcript }),
            transcript,
          );
          const degradedResponse = buildDegradedAnalysisResponse(degradedResult, transcript);
          if (degradedResult.level === "degraded") {
            throw degradedResult.originalError ?? new Error("AI analysis is unavailable.");
          }
          analysis = degradedResponse.data;
          degraded = degradedResponse.degraded ?? false;
          message = degradedResponse.message;
        }

        const t1 = Date.now();
        if (!analysis) {
          throw new Error("AI analysis returned no result.");
        }
        recordAiCall({
          provider: "default",
          model: "default",
          feature: comprehensiveData ? "comprehensive" : "analysis",
          inputTokens: Math.ceil(JSON.stringify(transcript).length / 4),
          outputTokens: Math.ceil(JSON.stringify(analysis).length / 4),
          elapsedMs: t1 - t0,
          success: true,
          userId: userId ?? undefined,
          videoId,
        });

        try {
          await upsertAnalysisCache({ videoId, metadata, transcript, analysis });
        } catch (cacheError) {
          console.warn("[Analyze] Analysis cache write failed:", cacheError);
        }
        return {
          transcript,
          analysis,
          comprehensive: comprehensiveData ?? undefined,
          cached: false,
          degraded,
          message,
        };
      });

      await recordAnalysisUsage({ userId, videoId, request });
      return successResponse({
        videoId,
        ...result,
        preview: userId === null,
      });
    } catch (error) {
      console.error("Analysis failed", error);
      const providerFailure = getAiProviderFailure(error);
      if (providerFailure) {
        return errorResponse(providerFailure.code, providerFailure.message, providerFailure.status);
      }
      const message = error instanceof Error ? `分析失败：${error.message}` : "AI analysis could not be generated.";
      return errorResponse("analysis_failed", message, 502);
    }
  });
}
