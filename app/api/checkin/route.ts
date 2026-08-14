import { z } from "zod";
import { getCheckinSummary, incrementCheckin } from "@/lib/db/local-store";
import { isLocalMode } from "@/lib/local-mode";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { queryTencent } from "@/lib/tencent-db";
import type { CheckinStatus } from "@/lib/types";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { isActiveReviewDay } from "@/lib/product/retention";

const IncrementSchema = z.object({ wordCount: z.number().int().min(1).max(50).optional() });
type CheckinRow = { checkin_date: string; word_count: number };

function asDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function toStatus(rows: CheckinRow[]): CheckinStatus {
  const today = new Date().toISOString().slice(0, 10);
  const counts = new Map(rows.map((row) => [asDate(row.checkin_date), row.word_count]));
  const cursor = new Date(`${today}T00:00:00.000Z`);
  let streak = 0;
  for (let day = 0; day < 365; day += 1) {
    const date = cursor.toISOString().slice(0, 10);
    if (isActiveReviewDay(counts.get(date) ?? 0)) streak += 1;
    else if (day > 0) break;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return {
    streak,
    todayCompleted: isActiveReviewDay(counts.get(today) ?? 0),
    todayCount: counts.get(today) ?? 0,
    calendar: rows.slice(0, 30).map((row) => ({ date: asDate(row.checkin_date), count: row.word_count })),
  };
}

async function getRemoteStatus(userId: string): Promise<CheckinStatus> {
  const result = await queryTencent<CheckinRow>(
    `SELECT checkin_date::text, word_count FROM user_checkins
     WHERE user_id = $1 AND checkin_date >= CURRENT_DATE - INTERVAL '364 days'
     ORDER BY checkin_date DESC`,
    [userId],
  );
  return toStatus(result.rows);
}

export async function GET(request: Request) {
  if (isLocalMode()) return successResponse(await getCheckinSummary());
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可查看。", 401);
  return successResponse(await getRemoteStatus(userId));
}

export async function POST(request: Request) {
  return withSecurity({ allowedMethods: ["POST"], maxBodySize: 16 * 1024, scope: "checkin", rateLimit: { maxRequests: 60, windowMs: 60_000 } }).wrap(request, async () => {
    const parsed = await readJson(request, IncrementSchema);
    if (!parsed.ok) return parsed.response;
    const increment = parsed.data.wordCount ?? 1;
    if (isLocalMode()) return successResponse(await incrementCheckin(increment));
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "登录后可打卡。", 401);
    await queryTencent(
      `INSERT INTO user_checkins (user_id, checkin_date, word_count) VALUES ($1, CURRENT_DATE, $2)
       ON CONFLICT (user_id, checkin_date) DO UPDATE SET word_count = user_checkins.word_count + EXCLUDED.word_count`,
      [userId, increment],
    );
    return successResponse(await getRemoteStatus(userId));
  });
}
