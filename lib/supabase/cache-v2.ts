import { z } from "zod";
import {
  KeyMomentSchema,
  SummaryTakeawaySchema,
  type KeyMoment,
  type SummaryTakeaway,
} from "@/lib/types";
import type { ComprehensiveAnalysis } from "@/lib/ai/provider";
import { queryTencent } from "@/lib/tencent-db";
import { normalizeComprehensiveForCache } from "@/lib/utils/comprehensive-cache";

const SUCCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CachedMomentsSchema = z.object({
  result: z.array(KeyMomentSchema),
  created_at: z.string(),
});

const CachedSummarySchema = z.object({
  result: z.array(SummaryTakeawaySchema),
  created_at: z.string(),
});

type CachedResultRow = {
  result: unknown;
  created_at: string;
};

type RawCachedResultRow = {
  result: unknown;
  created_at: string | Date;
};

export function isFreshCacheEntry(createdAt: string, now = Date.now()): boolean {
  const createdMs = new Date(createdAt).getTime();
  return Number.isFinite(createdMs) && now - createdMs >= 0 && now - createdMs <= SUCCESS_TTL_MS;
}

async function getCachedResult(
  videoId: string,
  resultType: string,
  language = "",
  mode = "",
  theme = "",
): Promise<CachedResultRow | null> {
  const result = await queryTencent<RawCachedResultRow>(
    `SELECT result, created_at
     FROM ai_results_cache
     WHERE video_id = $1 AND result_type = $2 AND language = $3 AND mode = $4 AND theme = $5
     LIMIT 1`,
    [videoId, resultType, language, mode, theme],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function upsertCachedResult(input: {
  videoId: string;
  resultType: string;
  language?: string;
  mode?: string;
  theme?: string;
  result: unknown;
}) {
  await queryTencent(
    `INSERT INTO ai_results_cache (video_id, result_type, language, mode, theme, result, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
     ON CONFLICT (video_id, result_type, language, mode, theme) DO UPDATE SET
       result = EXCLUDED.result,
       updated_at = NOW()`,
    [
      input.videoId,
      input.resultType,
      input.language ?? "",
      input.mode ?? "",
      input.theme ?? "",
      JSON.stringify(input.result),
    ],
  );
}

export async function getCachedMoments(
  videoId: string,
  lang: string,
  mode: string,
  theme?: string,
): Promise<KeyMoment[] | null> {
  try {
    const cached = await getCachedResult(videoId, "moments", lang, mode, theme ?? "");
    const parsed = CachedMomentsSchema.safeParse(cached);
    if (!parsed.success || !isFreshCacheEntry(parsed.data.created_at) || parsed.data.result.length === 0) {
      return null;
    }
    return parsed.data.result;
  } catch {
    return null;
  }
}

export async function upsertMomentsCache(input: {
  videoId: string;
  lang: string;
  mode: string;
  theme?: string;
  moments: KeyMoment[];
}) {
  if (input.moments.length === 0) return;
  await upsertCachedResult({
    videoId: input.videoId,
    resultType: "moments",
    language: input.lang,
    mode: input.mode,
    theme: input.theme ?? "",
    result: input.moments,
  });
}

export async function getCachedSummary(videoId: string, lang: string): Promise<SummaryTakeaway[] | null> {
  try {
    const cached = await getCachedResult(videoId, "structured_summary", lang);
    const parsed = CachedSummarySchema.safeParse(cached);
    if (!parsed.success || !isFreshCacheEntry(parsed.data.created_at) || parsed.data.result.length === 0) {
      return null;
    }
    return parsed.data.result;
  } catch {
    return null;
  }
}

export async function upsertSummaryCache(input: {
  videoId: string;
  lang: string;
  takeaways: SummaryTakeaway[];
}) {
  if (input.takeaways.length === 0) return;
  await upsertCachedResult({
    videoId: input.videoId,
    resultType: "structured_summary",
    language: input.lang,
    result: input.takeaways,
  });
}

export async function getCachedComprehensive(videoId: string): Promise<ComprehensiveAnalysis | null> {
  try {
    const cached = await getCachedResult(videoId, "comprehensive", "en");
    if (!cached || !isFreshCacheEntry(cached.created_at) || typeof cached.result !== "object" || cached.result === null) {
      return null;
    }
    const result = cached.result as Record<string, unknown>;
    if (
      typeof result.summary !== "string" ||
      !Array.isArray(result.takeaways) ||
      !Array.isArray(result.moments) ||
      !Array.isArray(result.highlights) ||
      !Array.isArray(result.suggestedQuestions)
    ) {
      return null;
    }
    return normalizeComprehensiveForCache(result as unknown as ComprehensiveAnalysis);
  } catch {
    return null;
  }
}

export async function upsertComprehensiveCache(input: {
  videoId: string;
  result: ComprehensiveAnalysis;
}) {
  await upsertCachedResult({
    videoId: input.videoId,
    resultType: "comprehensive",
    language: "en",
    result: normalizeComprehensiveForCache(input.result),
  });
}
