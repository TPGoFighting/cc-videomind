import { TranslateTranscriptRequestSchema, TranscriptSegmentSchema, type TranscriptSegment } from "@/lib/types";
import { getAiProvider } from "@/lib/ai/provider";
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
  hasDisplayableTranslation,
  hasUsableTranslation,
  mergeCachedTranslation,
} from "@/lib/utils/translation";

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
  return provider.translateTranscript({ segments, targetLanguage });
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

  const segments = TranscriptSegmentSchema.array().parse(cached.transcript);

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
    if (hasDisplayableTranslation(merged)) {
      return Response.json({
        ok: true,
        data: { transcript: merged, cached: true, complete: hasCompleteTranslation(merged) },
      });
    }
  }

  // 旧缓存也可能只存了一部分真实译文；优先展示，避免重复调用供应商。
  if (hasDisplayableTranslation(segments)) {
    return Response.json({
      ok: true,
      data: { transcript: segments, cached: true, complete: hasCompleteTranslation(segments) },
    });
  }

  // 与原文相同的历史回退值不算翻译，仍可在完全没有缓存时重新处理。
  const untranslated = segments.filter((segment) => !hasUsableTranslation(segment));

  const BATCH_SIZE = 25;
  const CONCURRENCY = 5;

  const chunks: TranscriptSegment[][] = [];
  for (let i = 0; i < untranslated.length; i += BATCH_SIZE) {
    chunks.push(untranslated.slice(i, i + BATCH_SIZE));
  }

  const encoder = new TextEncoder();
  let translatedCount = 0;
  let failedBatchCount = 0;
  let aborted = false;

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

              for (const seg of translated) {
                if (aborted) return;
                const original = segments.find((s) => s.startTime === seg.startTime);
                if (original) {
                  // text_zh 在 translateTranscript 中已回退为原文，不会是 undefined
                  original.text_zh = seg.text_zh;
                  if (seg.text_zh && seg.text_zh !== seg.text) translatedCount++;
                }
                controller.enqueue(encoder.encode(sse({
                  type: "segment",
                  data: { startTime: seg.startTime, text_zh: seg.text_zh ?? seg.text }
                })));
              }
            } catch (error) {
              failedBatchCount++;
              console.error("[Translate] 翻译批次失败:", error);
              controller.enqueue(encoder.encode(sse({
                type: "error",
                data: { message: "部分字幕翻译失败，请重试。" }
              })));
            }
          }
        }

        const workers = Array.from(
          { length: Math.min(CONCURRENCY, chunks.length) },
          () => worker()
        );
        await Promise.all(workers);

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

        controller.enqueue(encoder.encode(sse({
          type: "done",
          data: { translatedCount, failedBatchCount }
        })));
        controller.close();
      } catch (err) {
        console.error("[Translate] 流式翻译失败:", err);
        controller.enqueue(encoder.encode(sse({
          type: "error",
          data: { message: err instanceof Error ? err.message : "翻译失败" }
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
