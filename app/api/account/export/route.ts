import { NextResponse } from "next/server";
import { getTencentUser } from "@/lib/tencent-auth";
import { isLocalMode } from "@/lib/local-mode";
import { withSecurity } from "@/lib/security/middleware";
import { queryTencent } from "@/lib/tencent-db";
import { errorResponse } from "@/lib/utils/api";

export async function GET(request: Request) {
  return withSecurity({
    allowedMethods: ["GET"],
    scope: "account-export",
    rateLimit: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  }).wrap(request, async () => {
    if (isLocalMode()) return errorResponse("not_available", "本地模式没有云端账户数据。", 409);
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);

    const [
      account,
      videos,
      notes,
      vocabulary,
      quotes,
      reviews,
      quoteReviews,
      checkins,
      payments,
      privacy,
      reviewPreference,
      deletions,
    ] = await Promise.all([
      queryTencent(`SELECT id, email, role, subscription_tier, created_at FROM app_users WHERE id = $1`, [user.id]),
      queryTencent(`SELECT video_id, created_at FROM user_videos WHERE user_id = $1 ORDER BY created_at DESC`, [user.id]),
      queryTencent(`SELECT id, video_id, body, timestamp_seconds, created_at FROM user_notes WHERE user_id = $1 ORDER BY created_at DESC`, [user.id]),
      queryTencent(`SELECT id, lemma, video_id, source_time, definition_zh, definition_en, phonetic, part_of_speech, example_en, example_zh, created_at, updated_at FROM user_vocabulary WHERE user_id = $1 ORDER BY created_at DESC`, [user.id]),
      queryTencent(`SELECT id, video_id, text_en, text_zh, start_time, end_time, notes, created_at FROM user_quotes WHERE user_id = $1 ORDER BY created_at DESC`, [user.id]),
      queryTencent(`SELECT lemma, repetitions, ease_factor, interval_days, next_review_at, last_reviewed_at, status, updated_at FROM user_word_reviews WHERE user_id = $1 ORDER BY updated_at DESC`, [user.id]),
      queryTencent(`SELECT quote_id, repetitions, ease_factor, interval_days, next_review_at, last_reviewed_at, status, updated_at FROM user_quote_reviews WHERE user_id = $1 ORDER BY updated_at DESC`, [user.id]),
      queryTencent(`SELECT checkin_date, word_count FROM user_checkins WHERE user_id = $1 ORDER BY checkin_date DESC`, [user.id]),
      queryTencent(`SELECT id, tier, status, created_at, reviewed_at FROM payment_submissions WHERE user_id = $1 ORDER BY created_at DESC`, [user.id]),
      queryTencent(`SELECT analytics_enabled, consented_at, updated_at FROM user_privacy_preferences WHERE user_id = $1`, [user.id]),
      queryTencent(`SELECT cadence, updated_at FROM user_review_preferences WHERE user_id = $1`, [user.id]),
      queryTencent(`SELECT id, status, requested_at, process_after, completed_at, error_code FROM account_deletion_requests WHERE user_id = $1 ORDER BY requested_at DESC`, [user.id]),
    ]);

    const document = {
      version: 1,
      generatedAt: new Date().toISOString(),
      account: account.rows[0] ?? null,
      learning: {
        videos: videos.rows,
        notes: notes.rows,
        vocabulary: vocabulary.rows,
        quotes: quotes.rows,
        reviews: reviews.rows,
        quoteReviews: quoteReviews.rows,
        checkins: checkins.rows,
      },
      payments: payments.rows,
      privacyPreference: privacy.rows[0] ?? { analytics_enabled: false },
      reviewPreference: reviewPreference.rows[0] ?? { cadence: "steady" },
      deletionRequests: deletions.rows,
      exclusions: [
        "密码哈希、会话令牌和个人 AI API Key 不会进入导出文件。",
        "共享字幕、共享分析缓存和去标识化产品聚合不属于个人账户导出。",
      ],
    };
    const date = new Date().toISOString().slice(0, 10);
    return NextResponse.json(document, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="teach-player-export-${date}.json"`,
      },
    });
  });
}
