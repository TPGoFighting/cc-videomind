export const maxDuration = 120;

import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { getCachedMoments, upsertMomentsCache } from "@/lib/supabase/cache-v2";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAiProvider } from "@/lib/ai/provider";
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
    // 1. 查缓存
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
    const moments = await (await getAiProvider(userId ?? undefined)).generateKeyMoments({
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
  });
}
