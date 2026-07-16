import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";
import { withAnalysisDegradation, buildDegradedAnalysisResponse } from "@/lib/ai/degradation";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { withSecurity } from "@/lib/security/middleware";
import { upsertAnalysisCache } from "@/lib/supabase/cache";
import { upsertComprehensiveCache } from "@/lib/supabase/cache-v2";
import { getAuthenticatedUserId, recordAnalysisUsage } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import type { TranscriptSegment } from "@/lib/types";

const TranscriptSegmentSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  text: z.string(),
  text_zh: z.string().optional(),
});

const RequestSchema = z.object({
  videoId: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  transcript: z.array(TranscriptSegmentSchema).min(1).max(10000),
});

export const maxDuration = 120;

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 1024 * 1024,
    scope: "analyze",
    rateLimit: { maxRequests: 6, windowMs: 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, RequestSchema);
    if (!parsed.ok) return parsed.response;

    const { videoId, title, transcript } = parsed.data;
    const userId = await getAuthenticatedUserId(request);

    try {
      // 翻译延迟到用户切换中文模式时触发（通过 /api/translate-transcript SSE 端点）
      // 这里只做 AI 分析，不翻译
      const aiProvider = await getAiProvider(userId ?? undefined);
      const t0 = Date.now();

      // 先尝试 comprehensive 生成（一次 AI 调用生成全部内容）
      let comprehensiveData: Awaited<ReturnType<typeof aiProvider.generateComprehensiveAnalysis>> | null = null;
      let analysis: Awaited<ReturnType<typeof aiProvider.generateAnalysis>> | null = null;
      let degraded = false;
      let message: string | undefined;

      try {
        comprehensiveData = await aiProvider.generateComprehensiveAnalysis({ title, transcript });
        // 从 comprehensive 结果构建 VideoAnalysis（用于兼容现有缓存和前端）
        analysis = {
          summary: comprehensiveData.summary,
          takeaways: comprehensiveData.suggestedQuestions.slice(0, 8),
          suggestedQuestions: comprehensiveData.suggestedQuestions,
          highlights: comprehensiveData.highlights,
        };
        // 存 comprehensive 缓存
        try {
          await upsertComprehensiveCache({ videoId, result: comprehensiveData });
        } catch { /* 缓存写入失败不影响正常响应 */ }
      } catch (comprehensiveError) {
        console.warn("[Analyze] Comprehensive generation failed, falling back to basic analysis:", comprehensiveError);
        comprehensiveData = null;
        // fallback 到原始 analyze
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
      recordAiCall({
        provider: "default", model: "default", feature: comprehensiveData ? "comprehensive" : "analysis",
        inputTokens: Math.ceil(JSON.stringify(transcript).length / 4),
        outputTokens: Math.ceil(JSON.stringify(analysis).length / 4),
        elapsedMs: t1 - t0, success: true,
        userId: userId ?? undefined, videoId,
      });

      // 缓存结果（保存原始字幕，不含翻译）
      await upsertAnalysisCache({
        videoId,
        metadata: { videoId, title, authorName: "", thumbnailUrl: "", providerUrl: "" },
        transcript,
        analysis,
      });
      await recordAnalysisUsage({ userId, videoId, request });

      return successResponse({
        videoId,
        transcript,
        analysis,
        comprehensive: comprehensiveData ?? undefined,
        cached: false,
        preview: userId === null,
        degraded,
        message,
      });
    } catch (error) {
      console.error("Analysis failed", error);
      const providerFailure = getAiProviderFailure(error);
      if (providerFailure) {
        return errorResponse(providerFailure.code, providerFailure.message, providerFailure.status);
      }
      const message =
        error instanceof Error
          ? `分析失败：${error.message}`
          : "AI analysis could not be generated.";
      return errorResponse("analysis_failed", message, 502);
    }
  });
}
