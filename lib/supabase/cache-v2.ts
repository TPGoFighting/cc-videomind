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
      .maybeSingle();

    if (error || !data) return null;

    const parsed = CachedMomentsSchema.safeParse(data);
    if (!parsed.success) return null;

    const age = Date.now() - new Date(parsed.data.created_at).getTime();
    if (age > SUCCESS_TTL_MS) return null;

    return parsed.data.result;
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
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  await supabase.from("ai_results_cache").upsert(
    {
      video_id: input.videoId,
      result_type: "moments",
      language: input.lang,
      mode: input.mode,
      theme: input.theme ?? null,
      result: input.moments,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "video_id, result_type, language, mode, theme"
    }
  );
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
      .maybeSingle();

    if (error || !data) return null;

    const parsed = CachedSummarySchema.safeParse(data);
    if (!parsed.success) return null;

    const age = Date.now() - new Date(parsed.data.created_at).getTime();
    if (age > SUCCESS_TTL_MS) return null;

    return parsed.data.result;
  } catch {
    return null; // 表不存在等情况，静默降级
  }
}

export async function upsertSummaryCache(input: {
  videoId: string;
  lang: string;
  takeaways: SummaryTakeaway[];
}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  await supabase.from("ai_results_cache").upsert(
    {
      video_id: input.videoId,
      result_type: "structured_summary",
      language: input.lang,
      result: input.takeaways,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "video_id, result_type, language, mode, theme"
    }
  );
}
