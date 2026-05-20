import { TranslateTranscriptRequestSchema, TranscriptSegmentSchema, type TranscriptSegment } from "@/lib/types";
import { getAiProvider } from "@/lib/ai/provider";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

export const maxDuration = 120;

/** 翻译单批字幕 */
async function translateBatch(
  provider: Awaited<ReturnType<typeof getAiProvider>>,
  segments: TranscriptSegment[]
): Promise<TranscriptSegment[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await provider.translateTranscript({ segments });
    } catch (err) {
      if (attempt === 0) {
        // 失败时缩小批次重试
        const half = Math.ceil(segments.length / 2);
        const [a, b] = [
          await translateBatch(provider, segments.slice(0, half)),
          await translateBatch(provider, segments.slice(half)),
        ];
        return [...a, ...b];
      }
      throw err;
    }
  }
  return segments;
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

  const parsed = await readJson(request, TranslateTranscriptRequestSchema);
  if (!parsed.ok) return parsed.response;

  const { videoId } = parsed.data;

  // 加载缓存的 transcript
  const cached = await getCachedAnalysis(videoId);
  if (!cached?.transcript) {
    return errorResponse("no_transcript", "该视频没有字幕数据。", 404);
  }

  const segments = TranscriptSegmentSchema.array().parse(cached.transcript);

  // 如果已全部翻译过，直接返回
  const allTranslated = segments.every((s) => s.text_zh);
  if (allTranslated) {
    return successResponse({ transcript: segments });
  }

  // 分批 AI 翻译（每批最多 40 条，避免超时）
  const BATCH_SIZE = 40;
  try {
    const provider = await getAiProvider();
    const batches: TranscriptSegment[][] = [];
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      batches.push(segments.slice(i, i + BATCH_SIZE));
    }

    const translatedBatches = await Promise.all(
      batches.map((batch) => translateBatch(provider, batch))
    );
    const translated = translatedBatches.flat();

    // 回写到 video_analyses.transcript
    const supabase = createSupabaseServiceClient();
    if (supabase) {
      supabase
        .from("video_analyses")
        .update({ transcript: translated })
        .eq("video_id", videoId)
        .then(({ error }) => {
          if (error) console.error("[Translate] 回写翻译失败:", error.message);
        });
    }

    return successResponse({ transcript: translated });
  } catch (err) {
    console.error("[Translate] AI 翻译失败:", err);
    return errorResponse(
      "translation_failed",
      err instanceof Error ? err.message : "翻译失败，请稍后重试。",
      502
    );
  }
}
