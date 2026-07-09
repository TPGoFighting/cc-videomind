export const maxDuration = 120;

import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { getCachedSummary, upsertSummaryCache, getCachedComprehensive } from "@/lib/supabase/cache-v2";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAiProvider } from "@/lib/ai/provider";
import { withSummaryDegradation, buildDegradedResponse } from "@/lib/ai/degradation";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";
import { createEmptyDebug, GenerateSummaryRequestSchema } from "@/lib/types";

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 2 * 1024 * 1024,
    scope: "generate-summary",
    rateLimit: { maxRequests: 8, windowMs: 60_000 },
  }).wrap(request, async () => {
      const tStart = Date.now();

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
    // 0. 先检查 comprehensive 缓存（一次生成的所有内容）
    const comprehensiveCached = await getCachedComprehensive(videoId);
    if (comprehensiveCached && comprehensiveCached.takeaways && comprehensiveCached.takeaways.length > 0) {
      // 将 comprehensive.takeaways 转换为 SummaryTakeaway[] 格式
      const takeawaysFromComprehensive = comprehensiveCached.takeaways.map((t) => ({
        label: t.label,
        label_zh: t.label_zh ?? t.label,
        insight: t.insight,
        insight_zh: t.insight_zh ?? t.insight,
        timestamps: t.timestamps ?? [],
      }));
      console.log("[API:Summary] 从 comprehensive 缓存提取 takeaways, 返回 %d 条", takeawaysFromComprehensive.length);
      return successResponse({ takeaways: takeawaysFromComprehensive, cached: true, _debug: { comprehensive: true } });
    }

    // 1. 查 summary 专属缓存
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
    const degradedResult = await withSummaryDegradation(
      () => aiProvider.generateStructuredSummary({ title, transcript, targetLanguage: lang, debug }),
    );
    const { data: takeaways = [] } = buildDegradedResponse(degradedResult, []);
    const tAiEnd = Date.now();
    recordAiCall({
      provider: "default", model: "default", feature: "summary",
      inputTokens: Math.ceil(transcript.length * 50 / 4),
      outputTokens: Math.ceil(JSON.stringify(takeaways).length / 4),
      elapsedMs: tAiEnd - tAiStart, success: true,
      userId: userId ?? undefined, videoId,
    });

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
  });
}
