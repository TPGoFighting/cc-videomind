import { TranslateTranscriptRequestSchema, TranscriptSegmentSchema, type TranscriptSegment } from "@/lib/types";
import { getAiProvider } from "@/lib/ai/provider";
import { ExternalServiceError } from "@/lib/utils/http";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId, hasUserAnalyzedVideo } from "@/lib/supabase/quota";
import { isBilibiliImportedVideoId } from "@/lib/bilibili/id";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { getLatestTranslation, upsertTranslation } from "@/lib/supabase/translations";
import { isLocalMode } from "@/lib/local-mode";
import { getLatestTranslation as getLocalLatestTranslation, saveTranslationVersion } from "@/lib/db/local-store";
import { upsertTranscriptCache } from "@/lib/supabase/cache";
import { errorResponse, readJson } from "@/lib/utils/api";
import {
  hasCompleteTranslation,
  hasUsableTranslation,
  mergeCachedTranslation,
} from "@/lib/utils/translation";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";

export const maxDuration = 300;

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/** 翻译单批（25 句），内部已带索引解析 + 原文回退 */
async function translateBatch(
  provider: Awaited<ReturnType<typeof getAiProvider>>,
  segments: TranscriptSegment[],
  targetLanguage: string
): Promise<TranscriptSegment[]> {
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await provider.translateTranscript({ segments, targetLanguage });
    } catch (error) {
      const retryable = error instanceof ExternalServiceError
        && [408, 425, 429, 502, 503, 504].includes(error.status ?? 0);
      if (!retryable || attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
  throw new Error("翻译批次未完成");
}

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 8 * 1024 * 1024,
    scope: "translate-transcript",
    rateLimit: { maxRequests: 3, windowMs: 60_000 },
  }).wrap(request, async () => {
      const userId = await getAuthenticatedUserId(request);

  const parsed = await readJson(request, TranslateTranscriptRequestSchema);
  if (!parsed.ok) return parsed.response;

  const { videoId } = parsed.data;
  if (isBilibiliImportedVideoId(videoId) && (!userId || (!isLocalMode() && !await hasUserAnalyzedVideo(userId, videoId, request)))) {
    return errorResponse("workspace_not_found", "找不到这份导入字幕，或你没有访问权限。", 404);
  }

  const cached = await getCachedAnalysis(videoId);
  if (!cached?.transcript) {
    return errorResponse("no_transcript", "该视频没有字幕数据。", 404);
  }

  let segments = TranscriptSegmentSchema.array().parse(cached.transcript);

  // 自动语言检测与翻译目标语言选择
  const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);
  const textSample = segments.slice(0, 15).map((s) => s.text).join(" ");
  const targetLanguage = containsChinese(textSample) ? "English" : "zh-CN";

  // 快速路径：先检查 video_translations 表是否有完整翻译
  const lang = containsChinese(textSample) ? "en" : "zh";
  const existingTranslation = isLocalMode()
    ? await getLocalLatestTranslation(videoId, lang)
    : await getLatestTranslation(videoId, lang);
  if (existingTranslation) {
    const merged = mergeCachedTranslation(segments, existingTranslation.segments);
    if (hasCompleteTranslation(merged)) {
      return Response.json({
        ok: true,
        data: { transcript: merged, cached: true, complete: hasCompleteTranslation(merged) },
      });
    }
    segments = merged;
  }

  if (hasCompleteTranslation(segments)) {
    return Response.json({
      ok: true,
      data: { transcript: segments, cached: true, complete: hasCompleteTranslation(segments) },
    });
  }

  // 与原文相同的历史回退值不算翻译，仍可在完全没有缓存时重新处理。
  const untranslated = segments.filter((segment) => !hasUsableTranslation(segment));

  const BATCH_SIZE = 25;
  const CONCURRENCY = 2;

  const chunks: TranscriptSegment[][] = [];
  for (let i = 0; i < untranslated.length; i += BATCH_SIZE) {
    chunks.push(untranslated.slice(i, i + BATCH_SIZE));
  }

  const encoder = new TextEncoder();
  let translatedCount = 0;
  let failedBatchCount = 0;
  let firstBatchFailure = "";
  let aborted = false;
  let progressWriteChain = Promise.resolve();

  const persistProgress = () => {
    const snapshot = segments.map((segment) => ({ ...segment }));
    progressWriteChain = progressWriteChain.then(async () => {
      try {
        await upsertTranscriptCache({
          videoId,
          metadata: cached.metadata ?? undefined,
          transcript: snapshot,
        });
      } catch (error) {
        console.error("[Translate] 保存批次缓存失败:", error instanceof Error ? error.message : error);
      }
    });
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const provider = await getAiProvider(userId ?? undefined);

        // 并发 worker 处理
        let chunkIndex = 0;
        async function worker() {
          while (chunkIndex < chunks.length && !aborted) {
            const myIndex = chunkIndex++;
            const batch = chunks[myIndex];

            try {
              const translated = await translateBatch(provider, batch, targetLanguage);
              const usableTranslated = translated.filter(hasUsableTranslation);
              if (usableTranslated.length === 0) {
                failedBatchCount++;
                firstBatchFailure ||= "AI 翻译未返回有效译文";
                continue;
              }
              if (usableTranslated.length < batch.length) {
                failedBatchCount++;
                firstBatchFailure ||= "部分字幕未返回有效译文";
              }

              for (const seg of usableTranslated) {
                if (aborted) return;
                const original = segments.find((s) => s.startTime === seg.startTime);
                if (original) {
                  original.text_zh = seg.text_zh;
                  translatedCount++;
                }
                controller.enqueue(encoder.encode(sse({
                  type: "segment",
                  data: { startTime: seg.startTime, text_zh: seg.text_zh ?? seg.text }
                })));
              }
              persistProgress();
              controller.enqueue(encoder.encode(sse({
                type: "batch",
                data: {
                  batchIndex: myIndex,
                  totalBatches: chunks.length,
                  translatedCount: usableTranslated.length,
                },
              })));
            } catch (error) {
              failedBatchCount++;
              firstBatchFailure ||= error instanceof Error ? error.message : "翻译批次失败";
              console.error("[Translate] 翻译批次失败:", error instanceof Error ? error.message : error);
            }
          }
        }

        const workers = Array.from(
          { length: Math.min(CONCURRENCY, chunks.length) },
          () => worker()
        );
        await Promise.all(workers);
        await progressWriteChain;

        if (failedBatchCount > 0) {
          console.error("[Translate] 批次处理完成但存在失败: count=%d, first=%s", failedBatchCount, firstBatchFailure || "unknown");
        }

        // 保存到数据库
        if (translatedCount > 0) {
          if (isLocalMode()) {
            await Promise.all([
              saveTranslationVersion(videoId, lang, segments, { provider: "ai", model: "default" }),
              upsertTranscriptCache({ videoId, transcript: segments }),
            ]);
          } else {
            try {
              await Promise.all([
                upsertTranslation(videoId, lang, segments, "ai", "default"),
                upsertTranscriptCache({
                  videoId,
                  metadata: cached.metadata ?? undefined,
                  transcript: segments,
                }),
              ]);
            } catch (error) {
              console.error("[Translate] 保存翻译失败:", error);
            }
          }
        }

        if (failedBatchCount > 0) {
          controller.enqueue(encoder.encode(sse({
            type: "error",
            data: {
              message: translatedCount > 0
                ? "部分字幕翻译失败，已保留可用译文。"
                : "翻译服务暂时不可用，请稍后重试。",
              failedBatchCount,
            }
          })));
        }
        controller.enqueue(encoder.encode(sse({
          type: "done",
          data: { translatedCount, failedBatchCount }
        })));
        controller.close();
      } catch (err) {
        console.error("[Translate] 流式翻译失败:", err);
        const providerFailure = getAiProviderFailure(err);
        controller.enqueue(encoder.encode(sse({
          type: "error",
          data: { message: providerFailure?.message ?? "翻译服务暂时不可用，请稍后重试。" }
        })));
        controller.close();
      }
    },
    cancel() {
      aborted = true;
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
});
}
