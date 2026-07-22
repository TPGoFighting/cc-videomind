import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { withSecurity } from "@/lib/security/middleware";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { isLocalMode } from "@/lib/local-mode";
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

type WordDefinitionJoin = {
  lemma?: string | null;
  definition_zh?: string | null;
};

type ServerVocabularyRow = {
  id: string;
  created_at: string;
  video_id: string | null;
  word_definitions: WordDefinitionJoin | WordDefinitionJoin[] | null;
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
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return errorResponse("db_error", "数据库配置异常。", 500);
  }

  const mergedLogs: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. 服务端合并逻辑：遍历处理客户端在本地记的生词和删除 (覆盖同步最新的复习进度)
  // ═══════════════════════════════════════════════════════════════════════════════
  for (const change of localChanges) {
    try {
      const { lemma, videoId, isDeleted, reviewLevel, nextReviewAt, easeFactor } = change;

      // 首先查找或创建 word_definitions 记录，获取 word_id
      const { data: existingDef } = await serviceClient
        .from("word_definitions")
        .select("id")
        .eq("lemma", lemma)
        .single();

      let wordId: string;

      if (existingDef) {
        wordId = existingDef.id;
      } else {
        if (isDeleted) {
          // 本地已删除的，且云端无该单词释义的，直接跳过
          continue;
        }
        // 新增并且不存在，创建占位
        const { data: newDef, error: insertErr } = await serviceClient
          .from("word_definitions")
          .insert({ lemma, definition_zh: lemma })
          .select("id")
          .single();

        if (insertErr || !newDef) {
          console.error(`[Sync] 单词创建占位失败: ${lemma}`, insertErr);
          continue;
        }
        wordId = newDef.id;
      }

      if (isDeleted) {
        // A. 本地已取消收藏 -> 在云端删除该关联
        const { error: deleteErr } = await serviceClient
          .from("user_vocabulary")
          .delete()
          .eq("user_id", userId)
          .eq("word_id", wordId);

        if (deleteErr) {
          console.error(`[Sync] 离线取消收藏同步失败: ${lemma}`, deleteErr);
        } else {
          mergedLogs.push(`Deleted ${lemma}`);
        }
      } else {
        // B. 本地新收藏 / 进度同步 -> 在云端 upsert (允许覆盖复习进度，防 ignore 重复)
        const { error: upsertErr } = await serviceClient
          .from("user_vocabulary")
          .upsert(
            { 
              user_id: userId, 
              word_id: wordId, 
              video_id: videoId || null,
              review_level: reviewLevel ?? 0,
              next_review_at: nextReviewAt ? new Date(nextReviewAt).toISOString() : null,
              ease_factor: easeFactor ?? 2.5
            },
            {
              onConflict: "user_id,word_id",
              ignoreDuplicates: false // 必须设为 false 才能覆盖更新艾宾浩斯复习参数
            }
          );

        if (upsertErr) {
          console.error(`[Sync] 离线进度同步失败: ${lemma}`, upsertErr);
        } else {
          mergedLogs.push(`Synced ${lemma}`);
        }
      }
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
  const { data: serverNewData, error: selectErr } = await serviceClient
    .from("user_vocabulary")
    .select("id, created_at, video_id, review_level, next_review_at, ease_factor, word_definitions!inner(*)")
    .eq("user_id", userId)
    .gt("created_at", lastSyncDateStr)
    .order("created_at", { ascending: true });

  if (selectErr) {
    console.error(`[Sync] 获取服务端最新增量失败:`, selectErr);
    return errorResponse("db_error", "拉取云端增量失败。", 500);
  }

  // 映射为手机端 SQLite 易装载的数据格式
  const serverRows = (serverNewData ?? []) as unknown as ServerVocabularyRow[];
  const serverChanges = serverRows.map((row) => {
    const def = Array.isArray(row.word_definitions)
      ? row.word_definitions[0]
      : row.word_definitions;
    return {
      id: row.id,
      lemma: def?.lemma || "",
      definitionZh: def?.definition_zh || "",
      videoId: row.video_id,
      createdAt: new Date(row.created_at).getTime(),
      isDeleted: false // 增量新增
    };
  });

  console.log(`[Sync] 增量同步完成，合并了客户端 ${localChanges.length} 项变动，返回服务端 ${serverChanges.length} 项新变动`);

  return successResponse({
    success: true,
    serverChanges,
    mergedCount: mergedLogs.length,
    syncTimestamp: Date.now() // 返回当前时间戳作为客户端下一次同步的 lastSyncTime
  });
});
}
