import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";
import { GrammarAnalysisSchema } from "@/lib/types";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId, hasUserAnalyzedVideo } from "@/lib/supabase/quota";
import { isBilibiliImportedVideoId } from "@/lib/bilibili/id";
import { isLocalMode } from "@/lib/local-mode";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { runSingleFlight } from "@/lib/utils/single-flight";

const RequestSchema = z.object({
  videoId: z.string().min(6).max(64),
  sentence: z.string().trim().min(1).max(2_000),
});

type CachedGrammar = {
  value: z.infer<typeof GrammarAnalysisSchema>;
  expiresAt: number;
};

const grammarCache = new Map<string, CachedGrammar>();
const GRAMMAR_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const GRAMMAR_CACHE_MAX_ENTRIES = 500;

export const maxDuration = 60;

function getCacheKey(videoId: string, sentence: string): string {
  return `${videoId}:${sentence.trim().toLowerCase()}`;
}

function readGrammarCache(key: string): CachedGrammar["value"] | null {
  const cached = grammarCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    grammarCache.delete(key);
    return null;
  }
  // Refresh insertion order so the oldest entry is evicted first.
  grammarCache.delete(key);
  grammarCache.set(key, cached);
  return cached.value;
}

function writeGrammarCache(key: string, value: CachedGrammar["value"]): void {
  grammarCache.delete(key);
  grammarCache.set(key, { value, expiresAt: Date.now() + GRAMMAR_CACHE_TTL_MS });
  while (grammarCache.size > GRAMMAR_CACHE_MAX_ENTRIES) {
    const oldest = grammarCache.keys().next().value;
    if (typeof oldest !== "string") break;
    grammarCache.delete(oldest);
  }
}

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 16 * 1024,
    scope: "grammar-analysis",
    rateLimit: { maxRequests: 20, windowMs: 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, RequestSchema);
    if (!parsed.ok) return parsed.response;

    const { videoId, sentence } = parsed.data;
    const userId = await getAuthenticatedUserId(request);
    if (isBilibiliImportedVideoId(videoId) && (!userId || (!isLocalMode() && !await hasUserAnalyzedVideo(userId, videoId, request)))) {
      return errorResponse("workspace_not_found", "找不到这份导入字幕，或你没有访问权限。", 404);
    }

    const key = getCacheKey(videoId, sentence);
    const cached = readGrammarCache(key);
    if (cached) return successResponse({ ...cached, cached: true });

    try {
      const result = await runSingleFlight(`grammar-analysis:${key}`, async () => {
        const inFlightCached = readGrammarCache(key);
        if (inFlightCached) return { ...inFlightCached, cached: true };

        const startedAt = Date.now();
        const provider = await getAiProvider(userId ?? undefined);
        const value = GrammarAnalysisSchema.parse(await provider.generateGrammarAnalysis({ sentence }));
        recordAiCall({
          provider: "default",
          model: "default",
          feature: "grammar",
          inputTokens: Math.ceil(sentence.length / 4),
          outputTokens: Math.ceil(JSON.stringify(value).length / 4),
          elapsedMs: Date.now() - startedAt,
          success: true,
          userId: userId ?? undefined,
          videoId,
        });
        writeGrammarCache(key, value);
        return { ...value, cached: false };
      });

      return successResponse(result);
    } catch (error) {
      const providerFailure = getAiProviderFailure(error);
      if (providerFailure) {
        return errorResponse(providerFailure.code, providerFailure.message, providerFailure.status);
      }
      console.error("Grammar analysis failed", error);
      return errorResponse("grammar_analysis_failed", "语法分析暂时不可用，请稍后重试。", 502);
    }
  });
}
