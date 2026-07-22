import { z } from "zod";
import { getDueReviewWords, getReviewState, incrementCheckin, saveReviewState } from "@/lib/db/local-store";
import { isLocalMode } from "@/lib/local-mode";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { queryTencent } from "@/lib/tencent-db";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAccuracyBucket } from "@/lib/product/analytics-event";
import { recordProductEventSafely } from "@/lib/product/analytics-store";

const RequestSchema = z.object({ reviews: z.array(z.object({ lemma: z.string().min(1), quality: z.number().int().min(0).max(5) })).min(1).max(50) });

function sm2(quality: number, repetitions: number, easeFactor: number, intervalDays: number) {
  if (quality < 3) return { repetitions: 0, easeFactor: Math.max(1.3, easeFactor - 0.2), intervalDays: 0, nextReviewAt: new Date(Date.now() + 10 * 60 * 1000) };
  const base = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.round(intervalDays * easeFactor);
  const intervalDaysNext = quality >= 4 ? Math.round(base * 1.2) : base;
  const nextEase = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  return { repetitions: repetitions + 1, easeFactor: nextEase, intervalDays: intervalDaysNext, nextReviewAt: new Date(Date.now() + intervalDaysNext * 24 * 60 * 60 * 1000) };
}

export async function GET(request: Request) {
  if (isLocalMode()) {
    const words = await getDueReviewWords();
    return successResponse({ words: words.map((word) => ({
      lemma: word.lemma, phonetic: word.phonetic ?? undefined, partOfSpeech: word.partOfSpeech ?? undefined,
      definitionZh: word.definitionZh ?? word.lemma, definitionEn: word.definitionEn ?? undefined,
      exampleEn: word.exampleEn ?? undefined, exampleZh: word.exampleZh ?? undefined,
      repetitions: word.repetitions, easeFactor: word.easeFactor, intervalDays: word.intervalDays, status: word.status,
    })) });
  }
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可复习。", 401);
  const result = await queryTencent<{
    lemma: string; phonetic: string | null; part_of_speech: string | null; definition_zh: string | null; definition_en: string | null; example_en: string | null; example_zh: string | null;
    repetitions: number | null; ease_factor: number | null; interval_days: number | null; status: string | null;
  }>(
    `SELECT v.lemma, v.phonetic, v.part_of_speech, v.definition_zh, v.definition_en, v.example_en, v.example_zh,
       r.repetitions, r.ease_factor, r.interval_days, r.status
     FROM user_vocabulary v LEFT JOIN user_word_reviews r ON r.user_id = v.user_id AND r.lemma = v.lemma
     WHERE v.user_id = $1 AND (r.next_review_at IS NULL OR r.next_review_at <= NOW())
     ORDER BY COALESCE(r.next_review_at, v.created_at) ASC LIMIT 20`,
    [userId],
  );
  await recordProductEventSafely(userId, {
    name: "review_opened",
    payload: { dueCount: result.rows.length },
  });
  return successResponse({ words: result.rows.map((word) => ({
    lemma: word.lemma, phonetic: word.phonetic ?? undefined, partOfSpeech: word.part_of_speech ?? undefined,
    definitionZh: word.definition_zh ?? word.lemma, definitionEn: word.definition_en ?? undefined,
    exampleEn: word.example_en ?? undefined, exampleZh: word.example_zh ?? undefined,
    repetitions: word.repetitions ?? 0, easeFactor: word.ease_factor ?? 2.5, intervalDays: word.interval_days ?? 0, status: word.status ?? "learning",
  })) });
}

export async function POST(request: Request) {
  return withSecurity({ allowedMethods: ["POST"], maxBodySize: 32 * 1024, scope: "review", rateLimit: { maxRequests: 30, windowMs: 60_000 } }).wrap(request, async () => {
    const parsed = await readJson(request, RequestSchema);
    if (!parsed.ok) return parsed.response;
    if (isLocalMode()) {
      await Promise.all(parsed.data.reviews.map(async ({ lemma, quality }) => {
        const previous = await getReviewState(lemma);
        const next = sm2(quality, previous?.repetitions ?? 0, previous?.easeFactor ?? 2.5, previous?.intervalDays ?? 0);
        await saveReviewState({ lemma, repetitions: next.repetitions, easeFactor: next.easeFactor, intervalDays: next.intervalDays, nextReviewAt: next.nextReviewAt.toISOString(), status: next.intervalDays >= 30 ? "mastered" : next.repetitions > 0 ? "reviewing" : "learning" });
      }));
      return successResponse({ ok: true, checkin: await incrementCheckin(parsed.data.reviews.length) });
    }
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "登录后可复习。", 401);
    await Promise.all(parsed.data.reviews.map(async ({ lemma, quality }) => {
      const previous = await queryTencent<{ repetitions: number; ease_factor: number; interval_days: number }>(
        `SELECT repetitions, ease_factor, interval_days FROM user_word_reviews WHERE user_id = $1 AND lemma = $2`, [userId, lemma],
      );
      const row = previous.rows[0];
      const next = sm2(quality, row?.repetitions ?? 0, row?.ease_factor ?? 2.5, row?.interval_days ?? 0);
      await queryTencent(
        `INSERT INTO user_word_reviews (user_id, lemma, repetitions, ease_factor, interval_days, next_review_at, last_reviewed_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
         ON CONFLICT (user_id, lemma) DO UPDATE SET repetitions = EXCLUDED.repetitions, ease_factor = EXCLUDED.ease_factor,
           interval_days = EXCLUDED.interval_days, next_review_at = EXCLUDED.next_review_at, last_reviewed_at = NOW(), status = EXCLUDED.status, updated_at = NOW()`,
        [userId, lemma, next.repetitions, next.easeFactor, next.intervalDays, next.nextReviewAt, next.intervalDays >= 30 ? "mastered" : next.repetitions > 0 ? "reviewing" : "learning"],
      );
    }));
    await queryTencent(
      `INSERT INTO user_checkins (user_id, checkin_date, word_count) VALUES ($1, CURRENT_DATE, $2)
       ON CONFLICT (user_id, checkin_date) DO UPDATE SET word_count = user_checkins.word_count + EXCLUDED.word_count`,
      [userId, parsed.data.reviews.length],
    );
    await recordProductEventSafely(userId, {
      name: "review_completed",
      payload: {
        completedCount: parsed.data.reviews.length,
        accuracyBucket: getAccuracyBucket(parsed.data.reviews.map((review) => review.quality)),
      },
    });
    return successResponse({ ok: true });
  });
}
