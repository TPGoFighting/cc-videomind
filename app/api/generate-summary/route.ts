import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getCachedSummary, upsertSummaryCache } from "@/lib/supabase/cache-v2";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAiProvider } from "@/lib/ai/provider";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";
import { GenerateSummaryRequestSchema } from "@/lib/types";

export async function POST(request: Request) {
  const tStart = Date.now();

  const rateLimit = checkRateLimit(getClientKey(request, "generate-summary"), 8, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many summary requests. Try again shortly.", 429);
  }

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
      return successResponse({ takeaways: cached, cached: true });
    }

    // 2. 取字幕
    const existing = await getCachedAnalysis(videoId);
    const title = existing?.metadata?.title ?? (await fetchYouTubeMetadata(videoId)).title;
    const transcript =
      existing?.transcript ?? (await getTranscriptProvider().getTranscript(videoId));

    console.log("[API:Summary] 字幕信息:", {
      title: title.slice(0, 60),
      segmentCount: transcript.length,
      totalChars: transcript.reduce((n, s) => n + s.text.length, 0)
    });

    // 3. AI 生成
    const tAiStart = Date.now();
    const takeaways = await getAiProvider().generateStructuredSummary({
      title,
      transcript,
      targetLanguage: lang
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
    return successResponse({ takeaways, cached: false });
  } catch (err) {
    console.error("[API:Summary] 失败:", err instanceof Error ? err.message : err);
    console.error("[API:Summary] 总耗时(失败): %dms", Date.now() - tStart);
    return errorResponse("summary_failed", "Summary could not be generated from the transcript.", 502);
  }
}
