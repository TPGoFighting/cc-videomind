import { z } from "zod";
import {
  KeyMomentSchema,
  SummaryTakeawaySchema,
  type KeyMoment,
  type SummaryTakeaway
} from "@/lib/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// ─── TTL 配置 ──────────────────────────────────────────────────────────────────

/** 成功结果缓存 7 天 */
const SUCCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Schema ────────────────────────────────────────────────────────────────────

const CachedMomentsSchema = z.object({
  result: z.array(KeyMomentSchema),
  created_at: z.string()
});

const CachedSummarySchema = z.object({
  result: z.array(SummaryTakeawaySchema),
  created_at: z.string()
});

// ─── Moments 缓存 ──────────────────────────────────────────────────────────────

export async function getCachedMoments(
  videoId: string,
  lang: string,
  mode: string,
  theme?: string
): Promise<KeyMoment[] | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("ai_results_cache")
      .select("result, created_at")
      .eq("video_id", videoId)
      .eq("result_type", "moments")
      .eq("language", lang)
      .eq("mode", mode)
      .eq("theme", theme ?? null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const parsed = CachedMomentsSchema.safeParse(data[0]);
    if (!parsed.success) return null;

    const age = Date.now() - new Date(parsed.data.created_at).getTime();
    if (age > SUCCESS_TTL_MS) return null;

    // 不返回空结果（可能是上次失败的毒缓存）
    const result = parsed.data.result;
    if (!result || result.length === 0) return null;

    return result;
  } catch {
    return null; // 表不存在等情况，静默降级
  }
}

export async function upsertMomentsCache(input: {
  videoId: string;
  lang: string;
  mode: string;
  theme?: string;
  moments: KeyMoment[];
}) {
  // 不缓存空结果，避免后续请求命中毒缓存
  if (!input.moments || input.moments.length === 0) return;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  // 先删旧记录，避免 NULL 不等问题导致多行共存
  await supabase
    .from("ai_results_cache")
    .delete()
    .eq("video_id", input.videoId)
    .eq("result_type", "moments")
    .eq("language", input.lang)
    .eq("mode", input.mode)
    .eq("theme", input.theme ?? null);

  await supabase.from("ai_results_cache").insert({
    video_id: input.videoId,
    result_type: "moments",
    language: input.lang,
    mode: input.mode,
    theme: input.theme ?? null,
    result: input.moments,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

// ─── Summary 缓存 ──────────────────────────────────────────────────────────────

export async function getCachedSummary(
  videoId: string,
  lang: string
): Promise<SummaryTakeaway[] | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("ai_results_cache")
      .select("result, created_at")
      .eq("video_id", videoId)
      .eq("result_type", "structured_summary")
      .eq("language", lang)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const parsed = CachedSummarySchema.safeParse(data[0]);
    if (!parsed.success) return null;

    const age = Date.now() - new Date(parsed.data.created_at).getTime();
    if (age > SUCCESS_TTL_MS) return null;

    // 不返回空结果（可能是上次失败的毒缓存）
    const result = parsed.data.result;
    if (!result || result.length === 0) return null;

    return result;
  } catch {
    return null; // 表不存在等情况，静默降级
  }
}

export async function upsertSummaryCache(input: {
  videoId: string;
  lang: string;
  takeaways: SummaryTakeaway[];
}) {
  // 不缓存空结果，避免后续请求命中毒缓存
  if (!input.takeaways || input.takeaways.length === 0) return;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  // 先删旧记录，避免 NULL 不等问题导致多行共存
  await supabase
    .from("ai_results_cache")
    .delete()
    .eq("video_id", input.videoId)
    .eq("result_type", "structured_summary")
    .eq("language", input.lang);

  await supabase.from("ai_results_cache").insert({
    video_id: input.videoId,
    result_type: "structured_summary",
    language: input.lang,
    result: input.takeaways,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}
