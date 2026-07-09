import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

// SM-2 算法参数
function sm2(quality: number, repetitions: number, easeFactor: number, intervalDays: number) {
  if (quality < 3) {
    const next = new Date(Date.now() + 10 * 60 * 1000);
    return { repetitions: 0, easeFactor: Math.max(1.3, easeFactor - 0.2), intervalDays: 0, nextReviewAt: next };
  }
  let newInterval: number;
  if (repetitions === 0) newInterval = 1;
  else if (repetitions === 1) newInterval = 3;
  else newInterval = Math.round(intervalDays * easeFactor);
  if (quality >= 4) newInterval = Math.round(newInterval * 1.2);
  const newEase = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const next = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);
  return { repetitions: repetitions + 1, easeFactor: newEase, intervalDays: newInterval, nextReviewAt: next };
}

const RequestSchema = z.object({
  reviews: z.array(z.object({
    lemma: z.string().min(1),
    quality: z.number().int().min(0).max(5)
  })).min(1).max(50)
});

/** 通过 word_definitions 表查询单词定义 */
async function getWordDefs(supabase: NonNullable<ReturnType<typeof createSupabaseServiceClient>>, lemmas: string[]) {
  const { data } = await supabase
    .from("word_definitions")
    .select("id, lemma, phonetic, part_of_speech, definition_zh, definition_en, example_en, example_zh")
    .in("lemma", lemmas);
  return data ?? [];
}

/** 构建 ReviewWord 对象 */
function buildWords(reviewRows: Record<string, unknown>[], defRows: Record<string, unknown>[]) {
  const defMap = new Map<string, Record<string, unknown>>();
  for (const d of defRows) defMap.set(d.lemma as string, d);

  return reviewRows.map((r) => {
    const def = defMap.get(r.lemma as string);
    return {
      lemma: r.lemma as string,
      phonetic: def?.phonetic as string | undefined,
      partOfSpeech: def?.part_of_speech as string | undefined,
      definitionZh: (def?.definition_zh as string) ?? "",
      definitionEn: def?.definition_en as string | undefined,
      exampleEn: def?.example_en as string | undefined,
      exampleZh: def?.example_zh as string | undefined,
      repetitions: r.repetitions as number,
      easeFactor: r.ease_factor as number,
      intervalDays: r.interval_days as number,
      status: r.status as string,
    };
  });
}

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可复习。", 401);

  const supabase = createSupabaseServiceClient();
  if (!supabase) return errorResponse("supabase_not_configured", "Supabase not configured.", 503);

  const now = new Date().toISOString();

  // 查询到期复习单词
  const { data: rows } = await supabase
    .from("user_word_reviews")
    .select("lemma, repetitions, ease_factor, interval_days, status")
    .eq("user_id", userId)
    .lte("next_review_at", now)
    .order("next_review_at", { ascending: true })
    .limit(20);

  if (rows?.length) {
    const lemmas = rows.map((r: Record<string, unknown>) => r.lemma as string);
    const defRows = await getWordDefs(supabase, lemmas);
    return successResponse({ words: buildWords(rows, defRows) });
  }

  // 自动从单词本同步
  const { data: vocabRows } = await supabase
    .from("user_vocabulary")
    .select("word_definitions!inner(lemma)")
    .eq("user_id", userId);

  if (vocabRows?.length) {
    const lemmas = vocabRows
      .map((r: Record<string, unknown>) => ((r.word_definitions as Record<string, unknown> | null)?.lemma as string) ?? "")
      .filter(Boolean);

    if (lemmas.length > 0) {
      const inserts = lemmas.map((l) => ({
        user_id: userId, lemma: l,
        repetitions: 0, ease_factor: 2.5, interval_days: 0,
        next_review_at: now, status: "learning",
      }));
      await supabase.from("user_word_reviews").upsert(inserts, { onConflict: "user_id,lemma" });

      // 重新查询
      const { data: newRows } = await supabase
        .from("user_word_reviews")
        .select("lemma, repetitions, ease_factor, interval_days, status")
        .eq("user_id", userId)
        .lte("next_review_at", now)
        .order("next_review_at", { ascending: true })
        .limit(20);

      if (newRows?.length) {
        const allLemmas = newRows.map((r: Record<string, unknown>) => r.lemma as string);
        const defRows = await getWordDefs(supabase, allLemmas);
        return successResponse({ words: buildWords(newRows, defRows) });
      }
    }
  }

  return successResponse({ words: [] });
}

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 32 * 1024,
    scope: "review",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => {
      const now = new Date().toISOString();
  const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) return parsed.response;

  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可复习。", 401);

  const supabase = createSupabaseServiceClient();
  if (!supabase) return errorResponse("supabase_not_configured", "Supabase not configured.", 503);

  for (const { lemma, quality } of parsed.data.reviews) {
    const { data: existing } = await supabase
      .from("user_word_reviews")
      .select("repetitions, ease_factor, interval_days")
      .eq("user_id", userId).eq("lemma", lemma).single();

    const prev = existing ?? { repetitions: 0, ease_factor: 2.5, interval_days: 0 };
    const next = sm2(quality, prev.repetitions as number, prev.ease_factor as number, prev.interval_days as number);
    const newStatus = next.intervalDays >= 30 ? "mastered" : (next.repetitions > 0 ? "reviewing" : "learning");

    await supabase.from("user_word_reviews").upsert({
      user_id: userId, lemma,
      repetitions: next.repetitions, ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      next_review_at: next.nextReviewAt.toISOString(),
      last_reviewed_at: now,
      status: newStatus, updated_at: now,
    }, { onConflict: "user_id,lemma" });
  }

  // 自动打卡
  const today = new Date().toISOString().slice(0, 10);
  const { data: ec } = await supabase
    .from("user_checkins").select("word_count")
    .eq("user_id", userId).eq("checkin_date", today).single();

  await supabase.from("user_checkins").upsert({
    user_id: userId, checkin_date: today,
    word_count: (ec?.word_count ?? 0) + parsed.data.reviews.length,
  }, { onConflict: "user_id,checkin_date" });

  return successResponse({ ok: true });
});
}
