import { z } from "zod";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import type { ReviewResult } from "@/lib/types";

// SM-2 算法参数
function sm2(
  quality: number,
  repetitions: number,
  easeFactor: number,
  intervalDays: number
): { repetitions: number; easeFactor: number; intervalDays: number; nextReviewAt: Date } {
  // quality: 0=忘了, 1-2=模糊, 3=记得, 4-5=简单
  if (quality < 3) {
    // 忘了：重置
    const next = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后
    return { repetitions: 0, easeFactor: Math.max(1.3, easeFactor - 0.2), intervalDays: 0, nextReviewAt: next };
  }

  // 计算新间隔
  let newInterval: number;
  if (repetitions === 0) newInterval = 1;
  else if (repetitions === 1) newInterval = 3;
  else newInterval = Math.round(intervalDays * easeFactor);

  // 质量加分
  if (quality >= 4) newInterval = Math.round(newInterval * 1.2);

  const newEase = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const newReps = repetitions + 1;
  const next = new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000);

  return { repetitions: newReps, easeFactor: newEase, intervalDays: newInterval, nextReviewAt: next };
}

const RequestSchema = z.object({
  reviews: z.array(z.object({
    lemma: z.string().min(1),
    quality: z.number().int().min(0).max(5)
  })).min(1).max(50)
});

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可复习。", 401);

  const supabase = createSupabaseServiceClient();
  if (!supabase) return errorResponse("supabase_not_configured", "Supabase not configured.", 503);

  // 获取到期复习的单词（next_review_at <= now），限制 20 个
  const { data: rows } = await supabase
    .from("user_word_reviews")
    .select("lemma, repetitions, ease_factor, interval_days, status")
    .eq("user_id", userId)
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(20);

  if (!rows?.length) {
    // 自动从单词本同步未复习的单词
    const { data: vocabRows } = await supabase
      .from("user_vocabulary")
      .select("lemma")
      .eq("user_id", userId);

    if (vocabRows?.length) {
      const lemmas = vocabRows.map((r: Record<string, unknown>) => r.lemma as string);
      // 批量插入复习记录（next_review_at = now，立即到期）
      const now = new Date().toISOString();
      const inserts = lemmas.map((l) => ({
        user_id: userId,
        lemma: l,
        repetitions: 0,
        ease_factor: 2.5,
        interval_days: 0,
        next_review_at: now, // 立即到期
        status: "learning",
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

      if (!newRows?.length) return successResponse({ words: [] });

      // 查询完整单词定义
      const { data: fullVocab } = await supabase
        .from("user_vocabulary")
        .select("*")
        .eq("user_id", userId)
        .in("lemma", newRows.map((r: Record<string, unknown>) => r.lemma as string));

      const defMap = new Map<string, Record<string, unknown>>();
      for (const d of fullVocab ?? []) {
        defMap.set(d.lemma as string, d);
      }

      const words = newRows.map((r: Record<string, unknown>) => {
        const def = defMap.get(r.lemma as string);
        return {
          lemma: r.lemma,
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

      return successResponse({ words });
    }

    return successResponse({ words: [] });
  }

  // 查询单词定义
  const lemmas = rows.map((r: Record<string, unknown>) => r.lemma as string);
  const { data: defRows } = await supabase
    .from("user_vocabulary")
    .select("*")
    .eq("user_id", userId)
    .in("lemma", lemmas);

  const defMap = new Map<string, Record<string, unknown>>();
  for (const d of defRows ?? []) {
    defMap.set(d.lemma as string, d);
  }

  const words = rows.map((r: Record<string, unknown>) => {
    const def = defMap.get(r.lemma as string);
    return {
      lemma: r.lemma,
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

  return successResponse({ words });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request, "review"), 30, 60_000);
  if (!rateLimit.allowed) return errorResponse("rate_limited", "请求过于频繁。", 429);

  const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) return parsed.response;

  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可复习。", 401);

  const supabase = createSupabaseServiceClient();
  if (!supabase) return errorResponse("supabase_not_configured", "Supabase not configured.", 503);

  // 处理每条复习记录
  for (const { lemma, quality } of parsed.data.reviews) {
    // 读取当前状态
    const { data: existing } = await supabase
      .from("user_word_reviews")
      .select("repetitions, ease_factor, interval_days")
      .eq("user_id", userId)
      .eq("lemma", lemma)
      .single();

    const prev = existing ?? { repetitions: 0, ease_factor: 2.5, interval_days: 0 };

    const next = sm2(
      quality,
      prev.repetitions as number,
      prev.ease_factor as number,
      prev.interval_days as number
    );

    const newStatus = next.intervalDays >= 30 ? "mastered" : (next.repetitions > 0 ? "reviewing" : "learning");

    await supabase
      .from("user_word_reviews")
      .upsert({
        user_id: userId,
        lemma,
        repetitions: next.repetitions,
        ease_factor: next.easeFactor,
        interval_days: next.intervalDays,
        next_review_at: next.nextReviewAt.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        status: newStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,lemma" });
  }

  // 自动打卡（统计今日复习次数）
  const today = new Date().toISOString().slice(0, 10);
  const reviewCount = parsed.data.reviews.length;

  const { data: existingCheckin } = await supabase
    .from("user_checkins")
    .select("word_count")
    .eq("user_id", userId)
    .eq("checkin_date", today)
    .single();

  await supabase
    .from("user_checkins")
    .upsert({
      user_id: userId,
      checkin_date: today,
      word_count: (existingCheckin?.word_count ?? 0) + reviewCount,
    }, { onConflict: "user_id,checkin_date" });

  return successResponse({ ok: true });
}
