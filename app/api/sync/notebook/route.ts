import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { isLocalMode } from "@/lib/local-mode";
import { queryTencent, withTencentTransaction } from "@/lib/tencent-db";
import {
  deleteVocabularyByWord,
  loadVocabulary,
  saveReviewState,
  saveVocabulary,
} from "@/lib/db/local-store";

// 校验客户端上传的数据格式 (扩展支持艾宾浩斯复习参数)
const LocalChangeSchema = z.object({
  lemma: z.string(),
  videoId: z.string().nullable().optional(),
  updatedAt: z.number(), // 客户端最后修改的毫秒时间戳
  isDeleted: z.boolean(), // 是否在客户端已被取消收藏
  reviewLevel: z.number().optional(),
  nextReviewAt: z.number().optional(),
  easeFactor: z.number().optional()
});

const SyncRequestSchema = z.object({
  lastSyncTime: z.number(), // 上次成功同步的时间戳 (毫秒)
  localChanges: z.array(LocalChangeSchema)
});

type ServerVocabularyRow = {
  id: string;
  lemma: string;
  definition_zh: string | null;
  video_id: string | null;
  changed_at: Date;
  repetitions: number | null;
  next_review_at: Date | null;
  ease_factor: number | null;
};

/** POST /api/sync/notebook — 生词本增量水位线同步 (艾宾浩斯进度支持) */
export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 4 * 1024 * 1024,
    scope: "sync-notebook",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => {
      const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "用户鉴权失败，请重新登录。", 401);
  }

  const parsed = await readJson(request, SyncRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  if (isLocalMode()) {
    for (const change of parsed.data.localChanges) {
      if (change.isDeleted) {
        await deleteVocabularyByWord(change.lemma);
        continue;
      }
      await saveVocabulary([{
        word: change.lemma,
        videoId: change.videoId ?? "local",
        definitionZh: change.lemma,
      }]);
      if (change.reviewLevel !== undefined || change.nextReviewAt !== undefined) {
        await saveReviewState({
          lemma: change.lemma,
          repetitions: change.reviewLevel ?? 0,
          easeFactor: change.easeFactor ?? 2.5,
          intervalDays: 0,
          nextReviewAt: change.nextReviewAt
            ? new Date(change.nextReviewAt).toISOString()
            : new Date().toISOString(),
          status: "learning",
        });
      }
    }
    const vocabulary = await loadVocabulary();
    return successResponse({
      success: true,
      serverChanges: vocabulary
        .filter((entry) => new Date(entry.createdAt).getTime() > parsed.data.lastSyncTime)
        .map((entry) => ({
          id: entry.id,
          lemma: entry.word,
          definitionZh: entry.definitionZh ?? entry.word,
          videoId: entry.videoId,
          createdAt: new Date(entry.createdAt).getTime(),
          isDeleted: false,
        })),
      mergedCount: parsed.data.localChanges.length,
      syncTimestamp: Date.now(),
    });
  }

  const { lastSyncTime, localChanges } = parsed.data;
  const mergedLogs: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. 服务端合并逻辑：遍历处理客户端在本地记的生词和删除 (覆盖同步最新的复习进度)
  // ═══════════════════════════════════════════════════════════════════════════════
  for (const change of localChanges) {
    try {
      const { lemma, videoId, isDeleted, reviewLevel, nextReviewAt, easeFactor } = change;
      await withTencentTransaction(async (client) => {
        if (isDeleted) {
          await client.query(
            `DELETE FROM user_word_reviews WHERE user_id = $1 AND lemma = $2`,
            [userId, lemma],
          );
          await client.query(
            `DELETE FROM user_vocabulary WHERE user_id = $1 AND lemma = $2`,
            [userId, lemma],
          );
          return;
        }

        await client.query(
          `INSERT INTO user_vocabulary
             (id, user_id, lemma, video_id, definition_zh, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $3, NOW(), NOW())
           ON CONFLICT (user_id, lemma) DO UPDATE SET
             video_id = EXCLUDED.video_id,
             updated_at = NOW()`,
          [randomUUID(), userId, lemma, videoId ?? "mobile-sync"],
        );

        if (reviewLevel !== undefined || nextReviewAt !== undefined || easeFactor !== undefined) {
          await client.query(
            `INSERT INTO user_word_reviews
               (user_id, lemma, repetitions, ease_factor, interval_days, next_review_at, status, updated_at)
             VALUES (
               $1,
               $2,
               COALESCE($3::integer, 0),
               COALESCE($4::double precision, 2.5),
               0,
               COALESCE($5::timestamptz, NOW()),
               CASE WHEN COALESCE($3::integer, 0) > 0 THEN 'reviewing' ELSE 'learning' END,
               NOW()
             )
             ON CONFLICT (user_id, lemma) DO UPDATE SET
               repetitions = COALESCE($3::integer, user_word_reviews.repetitions),
               ease_factor = COALESCE($4::double precision, user_word_reviews.ease_factor),
               next_review_at = COALESCE($5::timestamptz, user_word_reviews.next_review_at),
               status = CASE
                 WHEN $3::integer IS NULL THEN user_word_reviews.status
                 WHEN $3::integer > 0 THEN 'reviewing'
                 ELSE 'learning'
               END,
               updated_at = NOW()`,
            [
              userId,
              lemma,
              reviewLevel ?? null,
              easeFactor ?? null,
              nextReviewAt ? new Date(nextReviewAt).toISOString() : null,
            ],
          );
        }
      });

      mergedLogs.push(`${isDeleted ? "Deleted" : "Synced"} ${lemma}`);
    } catch (err) {
      console.error(`[Sync] 处理本地改动异常:`, err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. 服务端拉取逻辑：把云端最新的修改传回给手机端 (拉取复习进度参数)
  // ═══════════════════════════════════════════════════════════════════════════════
  // 将上次同步的时间戳转换为 SQL 兼容格式
  const lastSyncDateStr = new Date(lastSyncTime).toISOString();

  // 查询在上次同步后新建/修改的 user_vocabulary 记录
  const serverResult = await queryTencent<ServerVocabularyRow>(
    `SELECT vocabulary.id,
            vocabulary.lemma,
            vocabulary.definition_zh,
            vocabulary.video_id,
            GREATEST(vocabulary.updated_at, COALESCE(review.updated_at, vocabulary.updated_at)) AS changed_at,
            review.repetitions,
            review.next_review_at,
            review.ease_factor
     FROM user_vocabulary vocabulary
     LEFT JOIN user_word_reviews review
       ON review.user_id = vocabulary.user_id AND review.lemma = vocabulary.lemma
     WHERE vocabulary.user_id = $1
       AND GREATEST(vocabulary.updated_at, COALESCE(review.updated_at, vocabulary.updated_at)) > $2::timestamptz
     ORDER BY changed_at ASC`,
    [userId, lastSyncDateStr],
  );

  // 映射为手机端 SQLite 易装载的数据格式
  const serverChanges = serverResult.rows.map((row) => ({
    id: row.id,
    lemma: row.lemma,
    definitionZh: row.definition_zh ?? row.lemma,
    videoId: row.video_id,
    createdAt: row.changed_at.getTime(),
    isDeleted: false,
    reviewLevel: row.repetitions ?? 0,
    nextReviewAt: row.next_review_at?.getTime(),
    easeFactor: row.ease_factor ?? 2.5,
  }));

  console.log(`[Sync] 增量同步完成，合并了客户端 ${localChanges.length} 项变动，返回服务端 ${serverChanges.length} 项新变动`);

  return successResponse({
    success: true,
    serverChanges,
    mergedCount: mergedLogs.length,
    syncTimestamp: Date.now() // 返回当前时间戳作为客户端下一次同步的 lastSyncTime
  });
});
}
