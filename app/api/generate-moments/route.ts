export const maxDuration = 120;

import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { getCachedMoments, upsertMomentsCache, getCachedComprehensive } from "@/lib/supabase/cache-v2";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";
import { withMomentsDegradation, buildDegradedResponse } from "@/lib/ai/degradation";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";
import { createEmptyDebug, GenerateMomentsRequestSchema } from "@/lib/types";

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 2 * 1024 * 1024,
    scope: "generate-moments",
    rateLimit: { maxRequests: 8, windowMs: 60_000 },
  }).wrap(request, async () => {
      const tStart = Date.now();

      const userId = await getAuthenticatedUserId(request);

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
    // 0. 先检查 comprehensive 缓存（一次生成的所有内容）
    const comprehensiveCached = await getCachedComprehensive(videoId);
    if (comprehensiveCached && comprehensiveCached.moments && comprehensiveCached.moments.length > 0) {
      // 将 comprehensive.moments 转换为 KeyMoment[] 格式
      const momentsFromComprehensive = comprehensiveCached.moments.map((m) => ({
        title: m.title,
        title_zh: m.title_zh ?? m.title,
        timestamp: m.timestamp,
        quote: m.quote,
        quote_zh: m.quote_zh ?? m.quote,
        reason: m.reason,
        reason_zh: m.reason_zh ?? m.reason,
      }));
      console.log("[API:Moments] 从 comprehensive 缓存提取 moments, 返回 %d 条", momentsFromComprehensive.length);
      return successResponse({ moments: momentsFromComprehensive, mode, cached: true, _debug: { comprehensive: true } });
    }

    // 1. 查 moments 专属缓存
    const cached = await getCachedMoments(videoId, lang, mode, theme);
    if (cached) {
      console.log("[API:Moments] 命中缓存, 返回 %d 条", cached.length);
      return successResponse({ moments: cached, mode, cached: true, _debug: { cached: true } });
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
    const debug = createEmptyDebug();
    const aiProvider = await getAiProvider(userId ?? undefined);
    const degradedResult = await withMomentsDegradation(
      () => aiProvider.generateKeyMoments({ title, transcript, mode, theme, targetLanguage: lang, debug }),
    );
    if (degradedResult.level === "degraded") {
      throw degradedResult.originalError ?? new Error("AI key-moment generation is unavailable.");
    }
    const { data: moments = [] } = buildDegradedResponse(degradedResult, []);
    const tAiEnd = Date.now();
    recordAiCall({
      provider: "default", model: "default", feature: "moments",
      inputTokens: Math.ceil(transcript.length * 50 / 4),
      outputTokens: Math.ceil(JSON.stringify(moments).length / 4),
      elapsedMs: tAiEnd - tAiStart, success: true,
      userId: userId ?? undefined, videoId,
    });

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
    const providerFailure = getAiProviderFailure(err);
    if (providerFailure) {
      return errorResponse(providerFailure.code, providerFailure.message, providerFailure.status);
    }
    return errorResponse("moments_failed", "Key moments could not be generated.", 502);
  }
  });
}
