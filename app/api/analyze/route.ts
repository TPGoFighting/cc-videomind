import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";
import { withAnalysisDegradation, buildDegradedAnalysisResponse } from "@/lib/ai/degradation";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { withSecurity } from "@/lib/security/middleware";
import { getCachedAnalysis, upsertAnalysisCache } from "@/lib/supabase/cache";
import { getCachedComprehensive, upsertComprehensiveCache } from "@/lib/supabase/cache-v2";
import { getAuthenticatedUserId, hasUserAnalyzedVideo, recordAnalysisUsage } from "@/lib/supabase/quota";
import { isBilibiliImportedVideoId } from "@/lib/bilibili/id";
import { isLocalMode } from "@/lib/local-mode";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { runSingleFlight } from "@/lib/utils/single-flight";
import { deriveComprehensiveFromAnalysis, normalizeComprehensiveForCache } from "@/lib/utils/comprehensive-cache";
import { hasReusableVideoAnalysis, normalizeAnalysisForCache } from "@/lib/utils/video-analysis-cache";
import type { VideoMetadata } from "@/lib/types";
import { recordProductEventSafely } from "@/lib/product/analytics-store";

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
  return { videoId, title, authorName: "" };
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
    if (isBilibiliImportedVideoId(videoId)) {
      if (!userId || (!isLocalMode() && !await hasUserAnalyzedVideo(userId, videoId, request))) {
        return errorResponse("workspace_not_found", "找不到这份导入字幕，或你没有访问权限。", 404);
      }
    }
    const analyticsStartedAt = Date.now();
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
      await recordProductEventSafely(userId, {
        name: "analysis_completed",
        payload: { durationMs: Date.now() - analyticsStartedAt, modelAlias: "shared-cache", cacheHit: true },
      });
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
      await recordProductEventSafely(userId, {
        name: "analysis_failed",
        payload: { durationMs: Date.now() - analyticsStartedAt, modelAlias: "configured", errorCode: "analysis_input_missing" },
      });
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
            analyticsCostMicrousd: undefined,
          };
        }

        const aiProvider = await getAiProvider(userId ?? undefined);
        const t0 = Date.now();
        let comprehensiveData: Awaited<ReturnType<typeof aiProvider.generateComprehensiveAnalysis>> | null = null;
        let analysis: Awaited<ReturnType<typeof aiProvider.generateAnalysis>> | null = null;
        let degraded = false;
        let message: string | undefined;

        try {
          comprehensiveData = normalizeComprehensiveForCache(
            await aiProvider.generateComprehensiveAnalysis({ title, transcript }),
          );
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
        analysis = normalizeAnalysisForCache(analysis, transcript);
        const aiCall = recordAiCall({
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
          analyticsCostMicrousd: Math.round(aiCall.cost * 1_000_000),
        };
      });

      await recordAnalysisUsage({ userId, videoId, request });
      const { analyticsCostMicrousd, ...responseResult } = result;
      await recordProductEventSafely(userId, {
        name: "analysis_completed",
        payload: {
          durationMs: Date.now() - analyticsStartedAt,
          modelAlias: result.cached ? "shared-cache" : "configured",
          cacheHit: result.cached,
          ...(analyticsCostMicrousd === undefined ? {} : { costMicrousd: analyticsCostMicrousd }),
        },
      });
      return successResponse({
        videoId,
        ...responseResult,
        preview: userId === null,
      });
    } catch (error) {
      console.error("Analysis failed", error);
      const providerFailure = getAiProviderFailure(error);
      if (providerFailure) {
        await recordProductEventSafely(userId, {
          name: "analysis_failed",
          payload: { durationMs: Date.now() - analyticsStartedAt, modelAlias: "configured", errorCode: providerFailure.code },
        });
        // Keep the workspace usable when every configured provider is unavailable.
        // This response is deliberately not written to the durable AI cache, so a
        // later retry can still generate and persist a real model result.
        const degraded = buildDegradedAnalysisResponse(
          {
            data: null,
            level: "degraded",
            message: providerFailure.message,
            originalError: error instanceof Error ? error : new Error(String(error)),
          },
          transcript,
        );
        return successResponse({
          videoId,
          transcript,
          analysis: degraded.data,
          comprehensive: deriveComprehensiveFromAnalysis(degraded.data),
          cached: false,
          preview: userId === null,
          degraded: true,
          message: providerFailure.message,
          errorCode: providerFailure.code,
        });
      }
      const message = error instanceof Error ? `分析失败：${error.message}` : "AI analysis could not be generated.";
      await recordProductEventSafely(userId, {
        name: "analysis_failed",
        payload: { durationMs: Date.now() - analyticsStartedAt, modelAlias: "configured", errorCode: "analysis_failed" },
      });
      return errorResponse("analysis_failed", message, 502);
    }
  });
}
