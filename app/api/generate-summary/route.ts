import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getCachedSummary, upsertSummaryCache } from "@/lib/supabase/cache-v2";
import { getCachedAnalysis } from "@/lib/supabase/cache";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAiProvider } from "@/lib/ai/provider";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";
import { GenerateSummaryRequestSchema } from "@/lib/types";

export async function POST(request: Request) {
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

  try {
    // 1. 查缓存
    const cached = await getCachedSummary(videoId, lang);
    if (cached) {
      return successResponse({ takeaways: cached, cached: true });
    }

    // 2. 取字幕
    const existing = await getCachedAnalysis(videoId);
    const title = existing?.metadata?.title ?? (await fetchYouTubeMetadata(videoId)).title;
    const transcript =
      existing?.transcript ?? (await getTranscriptProvider().getTranscript(videoId));

    // 3. AI 生成结构化摘要
    const takeaways = await getAiProvider().generateStructuredSummary({
      title,
      transcript,
      targetLanguage: lang
    });

    // 4. 存缓存（非致命：表不存在时不影响响应）
    try {
      await upsertSummaryCache({ videoId, lang, takeaways });
    } catch { /* 缓存写入失败不影响正常响应 */ }

    return successResponse({ takeaways, cached: false });
  } catch (err) {
    console.error("generate-summary failed:", err instanceof Error ? err.message : err);
    return errorResponse("summary_failed", "Summary could not be generated from the transcript.", 502);
  }
}
