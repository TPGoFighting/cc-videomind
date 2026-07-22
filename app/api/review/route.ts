import {
  getDueReviewQuotes,
  getDueReviewWords,
  getLocalRetentionStats,
  getLocalReviewCadence,
  getQuoteReviewState,
  getQuotes,
  getReviewState,
  incrementCheckin,
  loadVocabulary,
  saveQuoteReviewState,
  saveReviewState,
} from "@/lib/db/local-store";
import { isLocalMode } from "@/lib/local-mode";
import { getAccuracyBucket } from "@/lib/product/analytics-event";
import { recordProductEventSafely } from "@/lib/product/analytics-store";
import {
  buildReviewSourceHref,
  buildWeeklyReviewSummary,
  calculateReviewSchedule,
  explainDueReview,
  getReviewCadencePolicy,
  ReviewCadenceSchema,
  ReviewSubmissionRequestSchema,
  type QuoteReviewQueueItem,
  type ReviewCadence,
  type ReviewQueueItem,
  type TodayReviewSummary,
  type WordReviewQueueItem,
} from "@/lib/product/retention";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { queryTencent, withTencentTransaction } from "@/lib/tencent-db";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

function safeSourceHref(videoId: string, startTime: number | null) {
  try {
    return buildReviewSourceHref({ videoId, startTime });
  } catch {
    return `/video/${encodeURIComponent(videoId)}?resume=review`;
  }
}

function legacyWord(item: WordReviewQueueItem) {
  return {
    id: item.id,
    lemma: item.lemma,
    phonetic: item.phonetic ?? undefined,
    partOfSpeech: item.partOfSpeech ?? undefined,
    definitionZh: item.definitionZh,
    definitionEn: item.definitionEn ?? undefined,
    exampleEn: item.exampleEn ?? undefined,
    exampleZh: item.exampleZh ?? undefined,
    repetitions: item.repetitions,
    easeFactor: item.easeFactor,
    intervalDays: item.intervalDays,
    nextReviewAt: item.nextReviewAt,
    status: item.status,
    dueReason: item.dueReason,
    source: item.source,
  };
}

async function getLocalReviewPayload(now: Date) {
  const cadence = await getLocalReviewCadence();
  const policy = getReviewCadencePolicy(cadence);
  const [words, quotes, stats] = await Promise.all([
    getDueReviewWords(policy.dailyLimit),
    getDueReviewQuotes(policy.dailyLimit),
    getLocalRetentionStats(now),
  ]);
  const items: ReviewQueueItem[] = [
    ...words.map((word): WordReviewQueueItem => ({
      kind: "word",
      id: word.id,
      lemma: word.lemma,
      phonetic: word.phonetic ?? null,
      partOfSpeech: word.partOfSpeech ?? null,
      definitionZh: word.definitionZh ?? word.lemma,
      definitionEn: word.definitionEn ?? null,
      exampleEn: word.exampleEn ?? null,
      exampleZh: word.exampleZh ?? null,
      repetitions: word.repetitions,
      easeFactor: word.easeFactor,
      intervalDays: word.intervalDays,
      nextReviewAt: word.nextReviewAt,
      status: word.status,
      dueReason: explainDueReview(word),
      source: {
        videoId: word.videoId,
        videoTitle: null,
        startTime: word.sourceTime ?? null,
        href: safeSourceHref(word.videoId, word.sourceTime ?? null),
      },
    })),
    ...quotes.map((quote): QuoteReviewQueueItem => ({
      kind: "quote",
      id: quote.id,
      textEn: quote.textEn,
      textZh: quote.textZh ?? null,
      repetitions: quote.repetitions,
      easeFactor: quote.easeFactor,
      intervalDays: quote.intervalDays,
      nextReviewAt: quote.nextReviewAt,
      status: quote.status,
      dueReason: explainDueReview(quote),
      source: {
        videoId: quote.videoId,
        videoTitle: quote.videoTitle ?? null,
        startTime: quote.startTime,
        href: safeSourceHref(quote.videoId, quote.startTime),
      },
    })),
  ]
    .sort((left, right) => left.nextReviewAt.localeCompare(right.nextReviewAt))
    .slice(0, policy.dailyLimit);
  const wordCount = items.filter((item) => item.kind === "word").length;
  const summary: TodayReviewSummary = {
    dueCount: items.length,
    wordCount,
    quoteCount: items.length - wordCount,
    nextReviewAt: stats.nextReviewAt,
    cadence,
    dailyLimit: policy.dailyLimit,
  };
  const weekly = buildWeeklyReviewSummary({
    accountCreatedAt: stats.accountCreatedAt,
    activeDays: stats.activeDays,
    completedReviews: stats.completedReviews,
    savedItems: stats.savedItems,
    dueCount: summary.dueCount,
  }, now);
  return { items, summary, weekly };
}

type TencentQueueRow = {
  kind: "word" | "quote";
  id: string;
  lemma: string | null;
  phonetic: string | null;
  part_of_speech: string | null;
  definition_zh: string | null;
  definition_en: string | null;
  example_en: string | null;
  example_zh: string | null;
  text_en: string | null;
  text_zh: string | null;
  video_id: string;
  video_title: string | null;
  source_time: number | null;
  repetitions: number;
  ease_factor: number;
  interval_days: number;
  next_review_at: Date;
  status: string;
};

async function getTencentCadence(userId: string): Promise<ReviewCadence> {
  const result = await queryTencent<{ cadence: string }>(
    `SELECT cadence FROM user_review_preferences WHERE user_id = $1`,
    [userId],
  );
  const parsed = ReviewCadenceSchema.safeParse(result.rows[0]?.cadence);
  return parsed.success ? parsed.data : "steady";
}

async function getTencentReviewPayload(userId: string, now: Date) {
  const cadence = await getTencentCadence(userId);
  const policy = getReviewCadencePolicy(cadence);
  const [queue, stats] = await Promise.all([
    queryTencent<TencentQueueRow>(
      `SELECT * FROM (
         SELECT 'word'::text AS kind, v.id, v.lemma, v.phonetic, v.part_of_speech,
           v.definition_zh, v.definition_en, v.example_en, v.example_zh,
           NULL::text AS text_en, NULL::text AS text_zh, v.video_id,
           va.metadata->>'title' AS video_title, v.source_time,
           COALESCE(r.repetitions, 0) AS repetitions,
           COALESCE(r.ease_factor, 2.5) AS ease_factor,
           COALESCE(r.interval_days, 0) AS interval_days,
           COALESCE(r.next_review_at, v.created_at + INTERVAL '1 day') AS next_review_at,
           COALESCE(r.status, 'learning') AS status
         FROM user_vocabulary v
         LEFT JOIN user_word_reviews r ON r.user_id = v.user_id AND r.lemma = v.lemma
         LEFT JOIN video_analyses va ON va.video_id = v.video_id
         WHERE v.user_id = $1 AND COALESCE(r.next_review_at, v.created_at + INTERVAL '1 day') <= NOW()
         UNION ALL
         SELECT 'quote'::text AS kind, q.id, NULL::text AS lemma, NULL::text AS phonetic,
           NULL::text AS part_of_speech, NULL::text AS definition_zh, NULL::text AS definition_en,
           NULL::text AS example_en, NULL::text AS example_zh, q.text_en, q.text_zh, q.video_id,
           va.metadata->>'title' AS video_title, q.start_time AS source_time,
           COALESCE(r.repetitions, 0) AS repetitions,
           COALESCE(r.ease_factor, 2.5) AS ease_factor,
           COALESCE(r.interval_days, 0) AS interval_days,
           COALESCE(r.next_review_at, q.created_at + INTERVAL '1 day') AS next_review_at,
           COALESCE(r.status, 'learning') AS status
         FROM user_quotes q
         LEFT JOIN user_quote_reviews r ON r.user_id = q.user_id AND r.quote_id = q.id
         LEFT JOIN video_analyses va ON va.video_id = q.video_id
         WHERE q.user_id = $1 AND COALESCE(r.next_review_at, q.created_at + INTERVAL '1 day') <= NOW()
       ) due_items ORDER BY next_review_at ASC LIMIT $2`,
      [userId, policy.dailyLimit],
    ),
    queryTencent<{
      account_created_at: Date;
      active_days: string;
      completed_reviews: string;
      saved_items: string;
      due_count: string;
      next_review_at: Date | null;
    }>(
      `SELECT u.created_at AS account_created_at,
         (SELECT COUNT(*) FROM user_checkins c
          WHERE c.user_id = u.id AND c.checkin_date >= CURRENT_DATE - 6 AND c.word_count > 0) AS active_days,
         (SELECT COALESCE(SUM(c.word_count), 0) FROM user_checkins c
          WHERE c.user_id = u.id AND c.checkin_date >= CURRENT_DATE - 6) AS completed_reviews,
         ((SELECT COUNT(*) FROM user_vocabulary v WHERE v.user_id = u.id AND v.created_at >= NOW() - INTERVAL '7 days') +
          (SELECT COUNT(*) FROM user_quotes q WHERE q.user_id = u.id AND q.created_at >= NOW() - INTERVAL '7 days')) AS saved_items,
         ((SELECT COUNT(*) FROM user_vocabulary v LEFT JOIN user_word_reviews r
             ON r.user_id = v.user_id AND r.lemma = v.lemma
           WHERE v.user_id = u.id AND COALESCE(r.next_review_at, v.created_at + INTERVAL '1 day') <= NOW()) +
          (SELECT COUNT(*) FROM user_quotes q LEFT JOIN user_quote_reviews r
             ON r.user_id = q.user_id AND r.quote_id = q.id
           WHERE q.user_id = u.id AND COALESCE(r.next_review_at, q.created_at + INTERVAL '1 day') <= NOW())) AS due_count,
         (SELECT MIN(next_review_at) FROM (
            SELECT next_review_at FROM user_word_reviews WHERE user_id = u.id AND next_review_at > NOW()
            UNION ALL
            SELECT next_review_at FROM user_quote_reviews WHERE user_id = u.id AND next_review_at > NOW()
          ) future_reviews) AS next_review_at
       FROM app_users u WHERE u.id = $1`,
      [userId],
    ),
  ]);
  const items = queue.rows.map((row): ReviewQueueItem => {
    const shared = {
      id: row.id,
      repetitions: row.repetitions,
      easeFactor: row.ease_factor,
      intervalDays: row.interval_days,
      nextReviewAt: row.next_review_at.toISOString(),
      status: row.status,
      dueReason: explainDueReview(row),
      source: {
        videoId: row.video_id,
        videoTitle: row.video_title,
        startTime: row.source_time,
        href: safeSourceHref(row.video_id, row.source_time),
      },
    };
    if (row.kind === "quote") {
      return {
        ...shared,
        kind: "quote",
        textEn: row.text_en ?? "",
        textZh: row.text_zh,
      };
    }
    return {
      ...shared,
      kind: "word",
      lemma: row.lemma ?? "",
      phonetic: row.phonetic,
      partOfSpeech: row.part_of_speech,
      definitionZh: row.definition_zh ?? row.lemma ?? "",
      definitionEn: row.definition_en,
      exampleEn: row.example_en,
      exampleZh: row.example_zh,
    };
  });
  const row = stats.rows[0];
  const wordCount = items.filter((item) => item.kind === "word").length;
  const dueCount = Math.min(Number(row?.due_count ?? items.length), policy.dailyLimit);
  const summary: TodayReviewSummary = {
    dueCount,
    wordCount,
    quoteCount: items.length - wordCount,
    nextReviewAt: row?.next_review_at?.toISOString() ?? null,
    cadence,
    dailyLimit: policy.dailyLimit,
  };
  const weekly = buildWeeklyReviewSummary({
    accountCreatedAt: row?.account_created_at?.toISOString() ?? now.toISOString(),
    activeDays: Number(row?.active_days ?? 0),
    completedReviews: Number(row?.completed_reviews ?? 0),
    savedItems: Number(row?.saved_items ?? 0),
    dueCount,
  }, now);
  return { items, summary, weekly };
}

export async function GET(request: Request) {
  const summaryOnly = new URL(request.url).searchParams.get("summary") === "1";
  const now = new Date();
  if (isLocalMode()) {
    const payload = await getLocalReviewPayload(now);
    return successResponse(summaryOnly
      ? { summary: payload.summary, weekly: payload.weekly }
      : {
          ...payload,
          words: payload.items.filter((item): item is WordReviewQueueItem => item.kind === "word").map(legacyWord),
        });
  }
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可复习。", 401);
  const payload = await getTencentReviewPayload(userId, now);
  if (!summaryOnly) {
    await recordProductEventSafely(userId, {
      name: "review_opened",
      payload: { dueCount: payload.summary.dueCount },
    });
  }
  return successResponse(summaryOnly
    ? { summary: payload.summary, weekly: payload.weekly }
    : {
        ...payload,
        words: payload.items.filter((item): item is WordReviewQueueItem => item.kind === "word").map(legacyWord),
      });
}

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 32 * 1024,
    scope: "review",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, ReviewSubmissionRequestSchema);
    if (!parsed.ok) return parsed.response;
    const now = new Date();

    if (isLocalMode()) {
      const cadence = await getLocalReviewCadence();
      const vocabulary = await loadVocabulary();
      const quotes = await getQuotes();
      const results = [];
      for (const review of parsed.data.reviews) {
        if (review.kind === "word") {
          const owned = vocabulary.find((entry) => entry.id === review.id && entry.word === review.lemma);
          if (!owned) return errorResponse("not_found", "复习词条不存在或已被删除。", 404);
          const previous = await getReviewState(review.lemma);
          const next = calculateReviewSchedule({
            quality: review.quality,
            repetitions: previous?.repetitions ?? 0,
            easeFactor: previous?.easeFactor ?? 2.5,
            intervalDays: previous?.intervalDays ?? 0,
          }, cadence, now);
          await saveReviewState({ lemma: review.lemma, ...next });
          results.push({ kind: review.kind, id: review.id, nextReviewAt: next.nextReviewAt, explanation: next.explanation });
        } else {
          const owned = quotes.find((entry) => entry.id === review.id);
          if (!owned) return errorResponse("not_found", "复习句子不存在或已被删除。", 404);
          const previous = await getQuoteReviewState(review.id);
          const next = calculateReviewSchedule({
            quality: review.quality,
            repetitions: previous?.repetitions ?? 0,
            easeFactor: previous?.easeFactor ?? 2.5,
            intervalDays: previous?.intervalDays ?? 0,
          }, cadence, now);
          await saveQuoteReviewState({ quoteId: review.id, ...next });
          results.push({ kind: review.kind, id: review.id, nextReviewAt: next.nextReviewAt, explanation: next.explanation });
        }
      }
      return successResponse({
        ok: true,
        results,
        checkin: await incrementCheckin(parsed.data.reviews.length),
      });
    }

    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "登录后可复习。", 401);
    const cadence = await getTencentCadence(userId);
    let results: Array<{ kind: "word" | "quote"; id: string; nextReviewAt: string; explanation: string }> = [];
    try {
      results = await withTencentTransaction(async (client) => {
        const savedResults = [];
        for (const review of parsed.data.reviews) {
          if (review.kind === "word") {
            const owned = await client.query<{
              repetitions: number | null;
              ease_factor: number | null;
              interval_days: number | null;
            }>(
              `SELECT r.repetitions, r.ease_factor, r.interval_days
               FROM user_vocabulary v
               LEFT JOIN user_word_reviews r ON r.user_id = v.user_id AND r.lemma = v.lemma
               WHERE v.user_id = $1 AND v.id = $2 AND v.lemma = $3 FOR UPDATE OF v`,
              [userId, review.id, review.lemma],
            );
            const row = owned.rows[0];
            if (!row) throw new Error("review_item_not_found");
            const next = calculateReviewSchedule({
              quality: review.quality,
              repetitions: row.repetitions ?? 0,
              easeFactor: row.ease_factor ?? 2.5,
              intervalDays: row.interval_days ?? 0,
            }, cadence, now);
            await client.query(
              `INSERT INTO user_word_reviews
                 (user_id, lemma, repetitions, ease_factor, interval_days, next_review_at, last_reviewed_at, status)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
               ON CONFLICT (user_id, lemma) DO UPDATE SET
                 repetitions = EXCLUDED.repetitions,
                 ease_factor = EXCLUDED.ease_factor,
                 interval_days = EXCLUDED.interval_days,
                 next_review_at = EXCLUDED.next_review_at,
                 last_reviewed_at = NOW(),
                 status = EXCLUDED.status,
                 updated_at = NOW()`,
              [userId, review.lemma, next.repetitions, next.easeFactor, next.intervalDays, next.nextReviewAt, next.status],
            );
            savedResults.push({ kind: review.kind, id: review.id, nextReviewAt: next.nextReviewAt, explanation: next.explanation });
          } else {
            const owned = await client.query<{
              repetitions: number | null;
              ease_factor: number | null;
              interval_days: number | null;
            }>(
              `SELECT r.repetitions, r.ease_factor, r.interval_days
               FROM user_quotes q
               LEFT JOIN user_quote_reviews r ON r.user_id = q.user_id AND r.quote_id = q.id
               WHERE q.user_id = $1 AND q.id = $2 FOR UPDATE OF q`,
              [userId, review.id],
            );
            const row = owned.rows[0];
            if (!row) throw new Error("review_item_not_found");
            const next = calculateReviewSchedule({
              quality: review.quality,
              repetitions: row.repetitions ?? 0,
              easeFactor: row.ease_factor ?? 2.5,
              intervalDays: row.interval_days ?? 0,
            }, cadence, now);
            await client.query(
              `INSERT INTO user_quote_reviews
                 (user_id, quote_id, repetitions, ease_factor, interval_days, next_review_at, last_reviewed_at, status)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
               ON CONFLICT (user_id, quote_id) DO UPDATE SET
                 repetitions = EXCLUDED.repetitions,
                 ease_factor = EXCLUDED.ease_factor,
                 interval_days = EXCLUDED.interval_days,
                 next_review_at = EXCLUDED.next_review_at,
                 last_reviewed_at = NOW(),
                 status = EXCLUDED.status,
                 updated_at = NOW()`,
              [userId, review.id, next.repetitions, next.easeFactor, next.intervalDays, next.nextReviewAt, next.status],
            );
            savedResults.push({ kind: review.kind, id: review.id, nextReviewAt: next.nextReviewAt, explanation: next.explanation });
          }
        }
        await client.query(
          `INSERT INTO user_checkins (user_id, checkin_date, word_count)
           VALUES ($1, CURRENT_DATE, $2)
           ON CONFLICT (user_id, checkin_date) DO UPDATE
           SET word_count = user_checkins.word_count + EXCLUDED.word_count`,
          [userId, parsed.data.reviews.length],
        );
        return savedResults;
      });
    } catch (error) {
      if (error instanceof Error && error.message === "review_item_not_found") {
        return errorResponse("not_found", "复习内容不存在或已被删除。", 404);
      }
      throw error;
    }
    await recordProductEventSafely(userId, {
      name: "review_completed",
      payload: {
        completedCount: parsed.data.reviews.length,
        accuracyBucket: getAccuracyBucket(parsed.data.reviews.map((review) => review.quality)),
      },
    });
    return successResponse({ ok: true, results });
  });
}
