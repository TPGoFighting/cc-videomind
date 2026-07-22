import { randomUUID } from "node:crypto";
import { deleteVocabulary, getReviewState, loadVocabulary, saveReviewState, saveVocabulary } from "@/lib/db/local-store";
import { isLocalMode } from "@/lib/local-mode";
import { createInitialReviewState } from "@/lib/product/review-schedule";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { queryTencent } from "@/lib/tencent-db";
import { SaveWordRequestSchema } from "@/lib/types";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { recordLearningItemSavedSafely } from "@/lib/product/analytics-store";

export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId") ?? undefined;
  if (isLocalMode()) {
    const entries = (await loadVocabulary()).filter((entry) => !videoId || entry.videoId === videoId);
    return successResponse({ vocabulary: entries.map((entry) => ({
      id: entry.id, wordId: entry.id, lemma: entry.word, phonetic: entry.phonetic ?? undefined,
      partOfSpeech: entry.partOfSpeech ?? undefined, definitionZh: entry.definitionZh ?? entry.word,
      definitionEn: entry.definitionEn ?? undefined, exampleEn: entry.exampleEn ?? undefined,
      exampleZh: entry.exampleZh ?? undefined, videoId: entry.videoId, createdAt: entry.createdAt,
    })) });
  }
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "请先登录。", 401);
  const result = await queryTencent<{
    id: string; lemma: string; phonetic: string | null; part_of_speech: string | null; definition_zh: string | null; definition_en: string | null; example_en: string | null; example_zh: string | null; video_id: string; created_at: Date;
  }>(
    `SELECT id, lemma, phonetic, part_of_speech, definition_zh, definition_en, example_en, example_zh, video_id, created_at
     FROM user_vocabulary WHERE user_id = $1 ${videoId ? "AND video_id = $2" : ""} ORDER BY created_at DESC LIMIT 200`,
    videoId ? [userId, videoId] : [userId],
  );
  return successResponse({ vocabulary: result.rows.map((row) => ({
    id: row.id, wordId: row.id, lemma: row.lemma, phonetic: row.phonetic ?? undefined,
    partOfSpeech: row.part_of_speech ?? undefined, definitionZh: row.definition_zh ?? row.lemma,
    definitionEn: row.definition_en ?? undefined, exampleEn: row.example_en ?? undefined,
    exampleZh: row.example_zh ?? undefined, videoId: row.video_id, createdAt: row.created_at.toISOString(),
  })) });
}

export async function POST(request: Request) {
  return withSecurity({ allowedMethods: ["POST"], maxBodySize: 32 * 1024, scope: "user-vocabulary", rateLimit: { maxRequests: 30, windowMs: 60_000 } }).wrap(request, async () => {
    const parsed = await readJson(request, SaveWordRequestSchema);
    if (!parsed.ok) return parsed.response;
    const lemma = parsed.data.lemma.trim().toLowerCase();
    if (isLocalMode()) {
      await saveVocabulary([{ word: lemma, videoId: parsed.data.videoId, definitionZh: lemma }]);
      const existingReview = await getReviewState(lemma);
      if (!existingReview) await saveReviewState(createInitialReviewState(lemma));
      return successResponse({ saved: true, lemma, wordId: lemma });
    }
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "请先登录。", 401);
    const id = randomUUID();
    await queryTencent(
      `WITH saved AS (
         INSERT INTO user_vocabulary (id, user_id, lemma, video_id, definition_zh)
         VALUES ($1, $2, $3, $4, $3)
         ON CONFLICT (user_id, lemma) DO UPDATE SET video_id = EXCLUDED.video_id, updated_at = NOW()
         RETURNING lemma
       )
       INSERT INTO user_word_reviews (user_id, lemma, repetitions, ease_factor, interval_days, next_review_at, status)
       SELECT $2, saved.lemma, 0, 2.5, 1, NOW() + INTERVAL '1 day', 'learning' FROM saved
       ON CONFLICT (user_id, lemma) DO NOTHING`,
      [id, userId, lemma, parsed.data.videoId],
    );
    await recordLearningItemSavedSafely(userId, "word");
    return successResponse({ saved: true, lemma, wordId: id });
  });
}

export async function DELETE(request: Request) {
  return withSecurity({ allowedMethods: ["DELETE"], maxBodySize: 16 * 1024, scope: "user-vocabulary" }).wrap(request, async () => {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return errorResponse("invalid_request", "缺少 id 参数。", 400);
    if (isLocalMode()) { await deleteVocabulary(id); return successResponse({ deleted: true }); }
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "请先登录。", 401);
    await queryTencent(`DELETE FROM user_vocabulary WHERE id = $1 AND user_id = $2`, [id, userId]);
    return successResponse({ deleted: true });
  });
}
