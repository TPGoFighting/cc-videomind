import { TranslateTranscriptRequestSchema, TranscriptSegmentSchema, type TranscriptSegment } from "@/lib/types";
import { getAiProvider } from "@/lib/ai/provider";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, readJson } from "@/lib/utils/api";

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
  const rateLimit = checkRateLimit(
    getClientKey(request, "translate-transcript"),
    3,
    60_000
  );
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "翻译请求过于频繁。", 429);
  }

  const userId = await getAuthenticatedUserId(request);

  const parsed = await readJson(request, TranslateTranscriptRequestSchema);
  if (!parsed.ok) return parsed.response;

  const { videoId } = parsed.data;

  const cached = await getCachedAnalysis(videoId);
  if (!cached?.transcript) {
    return errorResponse("no_transcript", "该视频没有字幕数据。", 404);
  }

  const segments = TranscriptSegmentSchema.array().parse(cached.transcript);

  // 自动语言检测与翻译目标语言选择
  const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);
  const textSample = segments.slice(0, 15).map((s) => s.text).join(" ");
  const targetLanguage = containsChinese(textSample) ? "English" : "zh-CN";

  // 快速路径：已全部翻译
  const allTranslated = segments.every((s) => s.text_zh);
  if (allTranslated) {
    return Response.json({ ok: true, data: { transcript: segments } });
  }

  // 过滤未翻译的句子
  const untranslated = segments.filter((s) => !s.text_zh);

  const BATCH_SIZE = 25;
  const CONCURRENCY = 3;

  const chunks: TranscriptSegment[][] = [];
  for (let i = 0; i < untranslated.length; i += BATCH_SIZE) {
    chunks.push(untranslated.slice(i, i + BATCH_SIZE));
  }

  const encoder = new TextEncoder();
  let translatedCount = 0;
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
            } catch {
              // 整批失败：逐条用原文回退
              for (const seg of batch) {
                const original = segments.find((s) => s.startTime === seg.startTime);
                if (original) original.text_zh = seg.text;
                controller.enqueue(encoder.encode(sse({
                  type: "segment",
                  data: { startTime: seg.startTime, text_zh: seg.text }
                })));
              }
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
          const supabase = createSupabaseServiceClient();
          if (supabase) {
            supabase
              .from("video_analyses")
              .update({ transcript: segments })
              .eq("video_id", videoId)
              .then(({ error }) => {
                if (error) console.error("[Translate] 回写翻译失败:", error.message);
              });
          }
        }

        controller.enqueue(encoder.encode(sse({
          type: "done",
          data: { translatedCount }
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
}
