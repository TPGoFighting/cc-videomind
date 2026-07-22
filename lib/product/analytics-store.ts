import { randomUUID } from "node:crypto";
import { isLocalMode } from "@/lib/local-mode";
import { queryTencent } from "@/lib/tencent-db";
import {
  getAnalyticsExpiry,
  ProductEventSchema,
  type ProductEvent,
} from "./analytics-event";

export type ProductMetrics = {
  windowDays: number;
  eventCount: number;
  parse: { started: number; completed: number; failed: number; successRate: number | null; p50Ms: number | null; p95Ms: number | null };
  analysis: { completed: number; failed: number; cacheHitRate: number | null; costMicrousd: number; averageCostMicrousd: number | null };
  learning: { firstSaves: number; savingUsers: number; reviewOpened: number; reviewCompleted: number; d1ReturnRate: number | null; d7ReturnRate: number | null };
};

export async function getAnalyticsPreference(userId: string): Promise<boolean> {
  const result = await queryTencent<{ analytics_enabled: boolean }>(
    `SELECT analytics_enabled FROM user_privacy_preferences WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0]?.analytics_enabled ?? false;
}

export async function setAnalyticsPreference(userId: string, enabled: boolean): Promise<void> {
  await queryTencent(
    `INSERT INTO user_privacy_preferences (user_id, analytics_enabled, consented_at, updated_at)
     VALUES ($1, $2, CASE WHEN $2 THEN NOW() ELSE NULL END, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       analytics_enabled = EXCLUDED.analytics_enabled,
       consented_at = CASE
         WHEN EXCLUDED.analytics_enabled AND NOT user_privacy_preferences.analytics_enabled THEN NOW()
         WHEN EXCLUDED.analytics_enabled THEN user_privacy_preferences.consented_at
         ELSE NULL
       END,
       updated_at = NOW()`,
    [userId, enabled],
  );
}

export async function recordProductEvent(userId: string | null, input: ProductEvent): Promise<boolean> {
  if (!userId || isLocalMode()) return false;
  const event = ProductEventSchema.parse(input);
  if (!(await getAnalyticsPreference(userId))) return false;

  await queryTencent(
    `INSERT INTO product_events (id, user_id, event_name, payload, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [randomUUID(), userId, event.name, JSON.stringify(event.payload), getAnalyticsExpiry()],
  );
  return true;
}

export async function recordProductEventSafely(userId: string | null, input: ProductEvent): Promise<boolean> {
  try {
    return await recordProductEvent(userId, input);
  } catch {
    console.warn(`[ProductEvent] ${input.name} was not recorded.`);
    return false;
  }
}

export async function recordLearningItemSavedSafely(
  userId: string | null,
  itemKind: "word" | "quote",
): Promise<boolean> {
  if (!userId || isLocalMode()) return false;
  try {
    if (!(await getAnalyticsPreference(userId))) return false;
    const existing = await queryTencent<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM product_events
         WHERE user_id = $1 AND event_name = 'learning_item_saved'
       ) AS exists`,
      [userId],
    );
    return recordProductEvent(userId, {
      name: "learning_item_saved",
      payload: { itemKind, source: "youtube", isFirst: !(existing.rows[0]?.exists ?? false) },
    });
  } catch {
    console.warn("[ProductEvent] learning_item_saved was not recorded.");
    return false;
  }
}

function numberOrNull(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getProductMetrics(windowDays: number): Promise<ProductMetrics> {
  const result = await queryTencent<{
    event_count: string;
    parse_started: string;
    parse_completed: string;
    parse_failed: string;
    parse_p50_ms: string | number | null;
    parse_p95_ms: string | number | null;
    analysis_completed: string;
    analysis_failed: string;
    analysis_cache_hits: string;
    analysis_cost_microusd: string;
    first_saves: string;
    saving_users: string;
    review_opened: string;
    review_completed: string;
  }>(
    `WITH windowed AS (
       SELECT * FROM product_events
       WHERE occurred_at >= NOW() - make_interval(days => $1)
         AND expires_at > NOW()
     )
     SELECT
       COUNT(*)::text AS event_count,
       COUNT(*) FILTER (WHERE event_name = 'video_parse_started')::text AS parse_started,
       COUNT(*) FILTER (WHERE event_name = 'video_parse_completed')::text AS parse_completed,
       COUNT(*) FILTER (WHERE event_name = 'video_parse_failed')::text AS parse_failed,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY (payload->>'durationMs')::numeric)
         FILTER (WHERE event_name = 'video_parse_completed') AS parse_p50_ms,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY (payload->>'durationMs')::numeric)
         FILTER (WHERE event_name = 'video_parse_completed') AS parse_p95_ms,
       COUNT(*) FILTER (WHERE event_name = 'analysis_completed')::text AS analysis_completed,
       COUNT(*) FILTER (WHERE event_name = 'analysis_failed')::text AS analysis_failed,
       COUNT(*) FILTER (WHERE event_name = 'analysis_completed' AND payload->>'cacheHit' = 'true')::text AS analysis_cache_hits,
       COALESCE(SUM((payload->>'costMicrousd')::bigint) FILTER (WHERE event_name = 'analysis_completed'), 0)::text AS analysis_cost_microusd,
       COUNT(*) FILTER (WHERE event_name = 'learning_item_saved' AND payload->>'isFirst' = 'true')::text AS first_saves,
       COUNT(DISTINCT user_id) FILTER (WHERE event_name = 'learning_item_saved')::text AS saving_users,
       COUNT(*) FILTER (WHERE event_name = 'review_opened')::text AS review_opened,
       COUNT(*) FILTER (WHERE event_name = 'review_completed')::text AS review_completed
     FROM windowed`,
    [windowDays],
  );

  const cohort = await queryTencent<{ cohort_users: string; d1_users: string; d7_users: string }>(
    `WITH first_save AS (
       SELECT user_id, MIN(occurred_at) AS saved_at
       FROM product_events
       WHERE event_name = 'learning_item_saved' AND user_id IS NOT NULL AND expires_at > NOW()
       GROUP BY user_id
     ), eligible AS (
       SELECT * FROM first_save WHERE saved_at >= NOW() - make_interval(days => $1)
     )
     SELECT
       COUNT(*)::text AS cohort_users,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM product_events review
         WHERE review.user_id = eligible.user_id AND review.event_name = 'review_opened'
           AND review.occurred_at >= eligible.saved_at + INTERVAL '1 day'
           AND review.occurred_at < eligible.saved_at + INTERVAL '2 days'
       ))::text AS d1_users,
       COUNT(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM product_events review
         WHERE review.user_id = eligible.user_id AND review.event_name = 'review_opened'
           AND review.occurred_at >= eligible.saved_at + INTERVAL '7 days'
           AND review.occurred_at < eligible.saved_at + INTERVAL '8 days'
       ))::text AS d7_users
     FROM eligible`,
    [windowDays],
  );

  const row = result.rows[0];
  const cohortRow = cohort.rows[0];
  const parseStarted = Number(row?.parse_started ?? 0);
  const parseCompleted = Number(row?.parse_completed ?? 0);
  const analysisCompleted = Number(row?.analysis_completed ?? 0);
  const analysisCostMicrousd = Number(row?.analysis_cost_microusd ?? 0);
  const cohortUsers = Number(cohortRow?.cohort_users ?? 0);

  return {
    windowDays,
    eventCount: Number(row?.event_count ?? 0),
    parse: {
      started: parseStarted,
      completed: parseCompleted,
      failed: Number(row?.parse_failed ?? 0),
      successRate: parseStarted ? parseCompleted / parseStarted : null,
      p50Ms: numberOrNull(row?.parse_p50_ms ?? null),
      p95Ms: numberOrNull(row?.parse_p95_ms ?? null),
    },
    analysis: {
      completed: analysisCompleted,
      failed: Number(row?.analysis_failed ?? 0),
      cacheHitRate: analysisCompleted ? Number(row?.analysis_cache_hits ?? 0) / analysisCompleted : null,
      costMicrousd: analysisCostMicrousd,
      averageCostMicrousd: analysisCompleted ? analysisCostMicrousd / analysisCompleted : null,
    },
    learning: {
      firstSaves: Number(row?.first_saves ?? 0),
      savingUsers: Number(row?.saving_users ?? 0),
      reviewOpened: Number(row?.review_opened ?? 0),
      reviewCompleted: Number(row?.review_completed ?? 0),
      d1ReturnRate: cohortUsers ? Number(cohortRow?.d1_users ?? 0) / cohortUsers : null,
      d7ReturnRate: cohortUsers ? Number(cohortRow?.d7_users ?? 0) / cohortUsers : null,
    },
  };
}
