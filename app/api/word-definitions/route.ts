import { WordDefinitionsRequestSchema, type WordDefinition } from "@/lib/types";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiProviderFailure } from "@/lib/ai/provider-failure";
import { withWordDefsDegradation, buildDegradedResponse } from "@/lib/ai/degradation";
import { recordAiCall } from "@/lib/ai/cost-tracker";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import {
  getCachedWordDefinitions,
  upsertWordDefinitions,
} from "@/lib/supabase/cache-learn";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 256 * 1024,
    scope: "word-definitions",
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  }).wrap(request, async () => {
    const userId = await getAuthenticatedUserId(request);

    const parsed = await readJson(request, WordDefinitionsRequestSchema);
    if (!parsed.ok) return parsed.response;

    const { lemmas } = parsed.data;

    // 第1步：查询已缓存的定义
    let cached: WordDefinition[] = [];
    try {
      cached = await getCachedWordDefinitions(lemmas);
    } catch (err) {
      console.error("[WordDefs] 缓存查询失败（表可能不存在）:", err);
    }
    const cachedLemmas = new Set(cached.map((d) => d.lemma));
    const missing = lemmas.filter((l) => !cachedLemmas.has(l));

    // 第2步：AI 批量生成缺失的词义
    let generated: WordDefinition[] = [];
    if (missing.length > 0) {
      try {
        const provider = await getAiProvider(userId ?? undefined);
        const t0 = Date.now();
        const degradedResult = await withWordDefsDegradation(
          () => provider.defineWords({ lemmas: missing }),
        );
        if (degradedResult.level === "degraded") {
          throw degradedResult.originalError ?? new Error("AI word definition generation is unavailable.");
        }
        const { data: generatedDefs } = buildDegradedResponse(degradedResult, []);
        generated = generatedDefs ?? [];
        recordAiCall({
          provider: "default",
          model: "default",
          feature: "word-definitions",
          inputTokens: missing.length * 10,
          outputTokens: Math.ceil(JSON.stringify(generated).length / 4),
          elapsedMs: Date.now() - t0,
          success: generated.length > 0,
          userId: userId ?? undefined,
        });
        // 写入缓存（非致命）
        if (generated.length > 0) {
          upsertWordDefinitions(generated).catch((err) =>
            console.error("[WordDefs] 缓存写入失败（表可能不存在）:", err)
          );
        }
      } catch (err) {
        console.error("[WordDefs] AI 词义生成失败:", err);
        const providerFailure = getAiProviderFailure(err);
        if (providerFailure) {
          return errorResponse(providerFailure.code, providerFailure.message, providerFailure.status);
        }
      }
    }

    return successResponse({
      definitions: [...cached, ...generated],
    });
  });
}
