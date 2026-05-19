export const maxDuration = 120;

import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getCachedMoments, upsertMomentsCache } from "@/lib/supabase/cache-v2";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAiProvider } from "@/lib/ai/provider";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";
import { GenerateMomentsRequestSchema, type GenerationDebug } from "@/lib/types";

export async function POST(request: Request) {
  const tStart = Date.now();

  const rateLimit = checkRateLimit(getClientKey(request, "generate-moments"), 8, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many requests. Try again shortly.", 429);
  }

  const parsed = await readJson(request, GenerateMomentsRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { videoId, theme } = parsed.data;
  const mode = parsed.data.mode as "smart" | "fast";
  const lang = (parsed.data.targetLanguage ?? "zh") as "zh" | "en";

  console.log("[API:Moments] ====== 请求开始 ======");
  console.log("[API:Moments] 参数:", { videoId, mode, lang, theme: theme ?? "(无)" });

  try {
    // 1. 查缓存
    const cached = await getCachedMoments(videoId, lang, mode, theme);
    if (cached) {
      console.log("[API:Moments] 命中缓存, 返回 %d 条", cached.length);
      return successResponse({ moments: cached, mode, cached: true });
    }

    // 2. 取字幕
    const existing = await getCachedAnalysis(videoId);
    const title = existing?.metadata?.title ?? (await fetchYouTubeMetadata(videoId)).title;
    const transcript =
      existing?.transcript ?? (await getTranscriptProvider().getTranscript(videoId));

    console.log("[API:Moments] 字幕信息:", {
      title: title.slice(0, 60),
      segmentCount: transcript.length,
      totalChars: transcript.reduce((n, s) => n + s.text.length, 0),
      duration: transcript.length > 0
        ? `${Math.floor(transcript[transcript.length - 1].endTime / 60)}m`
        : "0m"
    });

    // 3. AI 生成
    const tAiStart = Date.now();
    const debug: GenerationDebug = {
      model: "", promptLength: 0, rawResponseLength: 0,
      rawResponsePreview: "", parseCount: 0, validateCount: 0, finalCount: 0
    };
    const moments = await getAiProvider().generateKeyMoments({
      title,
      transcript,
      mode,
      theme,
      targetLanguage: lang,
      debug
    });
    const tAiEnd = Date.now();

    console.log("[API:Moments] AI 生成完成:", {
      elapsedMs: tAiEnd - tAiStart,
      momentCount: moments.length,
      moments: moments.map(m => ({
        title: m.title.slice(0, 40),
        timestamp: m.timestamp,
        quoteLen: m.quote.length
      }))
    });

    // 4. 存缓存（非致命）
    try {
      await upsertMomentsCache({ videoId, lang, mode, theme, moments });
    } catch { /* 缓存写入失败不影响正常响应 */ }

    console.log("[API:Moments] ====== 请求完成, 总耗时 %dms ======", Date.now() - tStart);
    return successResponse({ moments, mode, cached: false, _debug: debug });
  } catch (err) {
    console.error("[API:Moments] 失败:", err instanceof Error ? err.message : err);
    console.error("[API:Moments] 总耗时(失败): %dms", Date.now() - tStart);
    return errorResponse("moments_failed", "Key moments could not be generated.", 502);
  }
}
