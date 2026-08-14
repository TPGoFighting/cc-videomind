import { randomUUID } from "node:crypto";
import { SaveQuoteRequestSchema } from "@/lib/types";
import {
  deleteQuote,
  getAnalysis,
  getQuotes,
  saveQuote,
  saveQuoteReviewState,
} from "@/lib/db/local-store";
import { isLocalMode } from "@/lib/local-mode";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { queryTencent, withTencentTransaction } from "@/lib/tencent-db";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { recordLearningItemSavedSafely } from "@/lib/product/analytics-store";
import { getInitialReviewAt } from "@/lib/product/retention";

export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId") ?? undefined;
  if (isLocalMode()) {
    const quotes = await getQuotes(videoId);
    return successResponse({ quotes: quotes.map((quote) => ({
      id: quote.id, userId: "local", videoId: quote.videoId, textEn: quote.textEn,
      textZh: quote.textZh ?? undefined, startTime: quote.startTime, endTime: quote.endTime,
      notes: quote.notes ?? undefined, createdAt: quote.createdAt, videoTitle: quote.videoTitle ?? undefined,
    })) });
  }
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "请先登录。", 401);
  const result = await queryTencent<{
    id: string; video_id: string; text_en: string; text_zh: string | null; start_time: number; end_time: number; notes: string | null; created_at: Date; metadata: { title?: string } | null;
  }>(
    `SELECT q.*, va.metadata FROM user_quotes q LEFT JOIN video_analyses va ON va.video_id = q.video_id
     WHERE q.user_id = $1 ${videoId ? "AND q.video_id = $2" : ""} ORDER BY q.created_at DESC LIMIT 200`,
    videoId ? [userId, videoId] : [userId],
  );
  return successResponse({ quotes: result.rows.map((row) => ({
    id: row.id, userId, videoId: row.video_id, textEn: row.text_en, textZh: row.text_zh ?? undefined,
    startTime: row.start_time, endTime: row.end_time, notes: row.notes ?? undefined,
    createdAt: row.created_at.toISOString(), videoTitle: row.metadata?.title,
  })) });
}

export async function POST(request: Request) {
  return withSecurity({ allowedMethods: ["POST"], maxBodySize: 32 * 1024, scope: "user-quotes", rateLimit: { maxRequests: 30, windowMs: 60_000 } }).wrap(request, async () => {
    const parsed = await readJson(request, SaveQuoteRequestSchema);
    if (!parsed.ok) return parsed.response;
    if (isLocalMode()) {
      const analysis = await getAnalysis(parsed.data.videoId);
      const id = await saveQuote({ ...parsed.data, videoTitle: analysis?.metadata?.title ?? null });
      const nextReviewAt = getInitialReviewAt();
      await saveQuoteReviewState({
        quoteId: id,
        repetitions: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        nextReviewAt,
        status: "learning",
      });
      return successResponse({ saved: true, id, nextReviewAt });
    }
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "请先登录。", 401);
    const id = randomUUID();
    const nextReviewAt = getInitialReviewAt();
    await withTencentTransaction(async (client) => {
      await client.query(
        `INSERT INTO user_quotes (id, user_id, video_id, text_en, text_zh, start_time, end_time, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, userId, parsed.data.videoId, parsed.data.textEn, parsed.data.textZh ?? null, parsed.data.startTime, parsed.data.endTime, parsed.data.notes ?? null],
      );
      await client.query(
        `INSERT INTO user_quote_reviews
           (user_id, quote_id, repetitions, ease_factor, interval_days, next_review_at, status)
         VALUES ($1, $2, 0, 2.5, 1, $3, 'learning')`,
        [userId, id, nextReviewAt],
      );
    });
    await recordLearningItemSavedSafely(userId, "quote");
    return successResponse({ saved: true, id, nextReviewAt });
  });
}

export async function DELETE(request: Request) {
  return withSecurity({ allowedMethods: ["DELETE"], maxBodySize: 16 * 1024, scope: "user-quotes" }).wrap(request, async () => {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("invalid_request", "缺少 id 参数。", 400);
    if (isLocalMode()) { await deleteQuote(id); return successResponse({ deleted: true }); }
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "请先登录。", 401);
    await queryTencent(`DELETE FROM user_quotes WHERE id = $1 AND user_id = $2`, [id, userId]);
    return successResponse({ deleted: true });
  });
}
