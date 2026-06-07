export const maxDuration = 120;

import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { getCachedSummary, upsertSummaryCache } from "@/lib/supabase/cache-v2";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAiProvider } from "@/lib/ai/provider";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";
import { createEmptyDebug, GenerateSummaryRequestSchema } from "@/lib/types";

export async function POST(request: Request) {
  const tStart = Date.now();

  const rateLimit = checkRateLimit(getClientKey(request, "generate-summary"), 8, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many summary requests. Try again shortly.", 429);
  }

  const userId = await getAuthenticatedUserId(request);

  const parsed = await readJson(request, GenerateSummaryRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { videoId } = parsed.data;
  const lang = (parsed.data.targetLanguage ?? "zh") as "zh" | "en";

  console.log("[API:Summary] ====== 请求开始 ======");
  console.log("[API:Summary] 参数:", { videoId, lang });

  try {
    // 1. 查缓存
    const cached = await getCachedSummary(videoId, lang);
    if (cached) {
      console.log("[API:Summary] 命中缓存, 返回 %d 条", cached.length);
      return successResponse({ takeaways: cached, cached: true, _debug: { cached: true } });
    }

    // 2. 取字幕
    const existing = await getCachedAnalysis(videoId);
    let title = existing?.metadata?.title;
    let transcript = existing?.transcript;

    if (!title || !transcript) {
      const isBilibili = /^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(videoId);
      if (isBilibili) {
        if (!title) {
          const { fetchBilibiliMetadata } = await import("@/lib/bilibili/metadata");
          const bilibiliMeta = await fetchBilibiliMetadata(videoId);
          title = bilibiliMeta.title;
        }
        if (!transcript) {
          const { BilibiliTranscriptProvider } = await import("@/lib/bilibili/transcript-provider");
          transcript = await new BilibiliTranscriptProvider().getTranscript(videoId);
        }
      } else {
        if (!title) {
          title = (await fetchYouTubeMetadata(videoId)).title;
        }
        if (!transcript) {
          transcript = await getTranscriptProvider().getTranscript(videoId);
        }
      }
    }

    console.log("[API:Summary] 字幕信息:", {
      title: title.slice(0, 60),
      segmentCount: transcript.length,
      totalChars: transcript.reduce((n, s) => n + s.text.length, 0)
    });

    // 3. AI 生成
    const tAiStart = Date.now();
    const debug = createEmptyDebug();
    const aiProvider = await getAiProvider(userId ?? undefined);
    const takeaways = await aiProvider.generateStructuredSummary({
      title,
      transcript,
      targetLanguage: lang,
      debug
    });
    const tAiEnd = Date.now();

    console.log("[API:Summary] AI 生成完成:", {
      elapsedMs: tAiEnd - tAiStart,
      takeawayCount: takeaways.length,
      takeaways: takeaways.map(t => ({
        label: t.label.slice(0, 40),
        insightLen: t.insight.length,
        timestamps: t.timestamps
      }))
    });

    // 4. 存缓存（非致命）
    try {
      await upsertSummaryCache({ videoId, lang, takeaways });
    } catch { /* 缓存写入失败不影响正常响应 */ }

    console.log("[API:Summary] ====== 请求完成, 总耗时 %dms ======", Date.now() - tStart);
    return successResponse({ takeaways, cached: false, _debug: debug });
  } catch (err) {
    console.error("[API:Summary] 失败:", err instanceof Error ? err.message : err);
    console.error("[API:Summary] 总耗时(失败): %dms", Date.now() - tStart);
    return errorResponse("summary_failed", "Summary could not be generated from the transcript.", 502);
  }
}
