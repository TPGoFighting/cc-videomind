import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { withSecurity } from "@/lib/security/middleware";
import { upsertAnalysisCache, getCachedAnalysis } from "@/lib/supabase/cache";
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

export const maxDuration = 180;

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 512 * 1024,
    scope: "analyze",
    rateLimit: { maxRequests: 6, windowMs: 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, RequestSchema);
    if (!parsed.ok) return parsed.response;

    const { videoId, title, transcript } = parsed.data;
    const userId = await getAuthenticatedUserId(request);

    try {
      const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);
      const hasTranslation = transcript.some((s) => s.text_zh?.trim());
      let finalTranscript: TranscriptSegment[] = transcript;

      // 自动翻译文稿
      if (!hasTranslation && transcript.length > 0) {
        try {
          console.log(`[Translate] 启动自动翻译, 视频ID: ${videoId}...`);
          const textSample = transcript.slice(0, 15).map((s) => s.text).join(" ");
          const targetLanguage = containsChinese(textSample) ? "English" : "zh-CN";
          console.log(`[Translate] 语言检测: ${containsChinese(textSample) ? "中文->英文" : "英文->中文"}`);

          const aiProvider = await getAiProvider(userId ?? undefined);

          const BATCH_SIZE = 30;
          const chunks: TranscriptSegment[][] = [];
          for (let i = 0; i < transcript.length; i += BATCH_SIZE) {
            chunks.push(transcript.slice(i, i + BATCH_SIZE));
          }

          // 限制并发数为3，避免AI provider限流
          const CONCURRENCY = 3;
          const translatedChunks: TranscriptSegment[][] = [];
          for (let i = 0; i < chunks.length; i += CONCURRENCY) {
            const batch = chunks.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
              batch.map((chunk) => aiProvider.translateTranscript({ segments: chunk, targetLanguage }))
            );
            translatedChunks.push(...results);
          }

          finalTranscript = translatedChunks.flat();
          console.log(`[Translate] 翻译完成, 总段数: ${finalTranscript.length}`);
        } catch (err) {
          console.error(`[Translate] 翻译失败，使用原文字幕:`, err);
        }
      }

      // AI 分析
      const analysis = await (await getAiProvider(userId ?? undefined)).generateAnalysis({
        title,
        transcript: finalTranscript,
      });

      // 缓存结果
      await upsertAnalysisCache({ videoId, metadata: { videoId, title, authorName: "", thumbnailUrl: "", providerUrl: "" }, transcript: finalTranscript, analysis });
      await recordAnalysisUsage({ userId, videoId, request });

      return successResponse({
        videoId,
        transcript: finalTranscript,
        analysis,
        cached: false,
        preview: userId === null,
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
