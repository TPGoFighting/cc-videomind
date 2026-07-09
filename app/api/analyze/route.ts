import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { withAnalysisDegradation, buildDegradedAnalysisResponse } from "@/lib/ai/degradation";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { withSecurity } from "@/lib/security/middleware";
import { upsertAnalysisCache } from "@/lib/supabase/cache";
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
      const degradedResult = await withAnalysisDegradation(
        () => aiProvider.generateAnalysis({ title, transcript }),
        transcript,
      );
      const { data: analysis, degraded, message } = buildDegradedAnalysisResponse(degradedResult, transcript);
      recordAiCall({
        provider: "default", model: "default", feature: "analysis",
        inputTokens: Math.ceil(JSON.stringify(transcript).length / 4),
        outputTokens: Math.ceil(JSON.stringify(analysis).length / 4),
        elapsedMs: Date.now() - t0, success: true,
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
        cached: false,
        preview: userId === null,
        degraded,
        message,
      });
    } catch (error) {
      console.error("Analysis failed", error);
      const message =
        error instanceof Error
          ? `分析失败：${error.message}`
          : "AI analysis could not be generated.";
      return errorResponse("analysis_failed", message, 502);
    }
  });
}
