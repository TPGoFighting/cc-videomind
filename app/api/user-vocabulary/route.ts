import { SaveWordRequestSchema } from "@/lib/types";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

/** GET /api/user-vocabulary — 获取用户收藏的单词 */
export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "请先登录。", 401);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return successResponse({ vocabulary: [] });
  }

  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId");

  let query = supabase
    .from("user_vocabulary")
    .select("id, created_at, video_id, word_definitions!inner(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (videoId) query = query.eq("video_id", videoId);

  const { data } = await query;

  const vocabulary = (data ?? []).map((row: Record<string, unknown>) => {
    const def = row.word_definitions as Record<string, unknown> | null;
    return {
      id: row.id as string,
      wordId: def?.id as string,
      lemma: def?.lemma as string,
      phonetic: def?.phonetic as string | undefined,
      partOfSpeech: def?.part_of_speech as string | undefined,
      definitionZh: def?.definition_zh as string,
      definitionEn: def?.definition_en as string | undefined,
      exampleEn: def?.example_en as string | undefined,
      exampleZh: def?.example_zh as string | undefined,
      videoId: row.video_id as string,
      createdAt: row.created_at as string,
    };
  });

  return successResponse({ vocabulary });
}

/** POST /api/user-vocabulary — 收藏单词 */
export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request, "user-vocabulary"), 30, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "操作过于频繁。", 429);
  }

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "请先登录。", 401);
  }

  const parsed = await readJson(request, SaveWordRequestSchema);
  if (!parsed.ok) return parsed.response;

  const { lemma, videoId } = parsed.data;

  // 查找或创建 word_definition
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) {
    return errorResponse("db_error", "数据库未配置。", 500);
  }

  // 先查 word_definitions
  const { data: existingDef } = await serviceClient
    .from("word_definitions")
    .select("id")
    .eq("lemma", lemma)
    .single();

  let wordId: string;

  if (existingDef) {
    wordId = existingDef.id;
  } else {
    // 创建占位记录（词义后续通过 AI 批量填充）
    const { data: newDef, error: insertErr } = await serviceClient
      .from("word_definitions")
      .insert({ lemma, definition_zh: lemma })
      .select("id")
      .single();

    if (insertErr || !newDef) {
      return errorResponse("db_error", "无法创建单词记录。", 500);
    }
    wordId = newDef.id;
  }

  // 插入 user_vocabulary（unique 约束防重复）
  const { error: vocabErr } = await serviceClient
    .from("user_vocabulary")
    .upsert({ user_id: userId, word_id: wordId, video_id: videoId }, {
      onConflict: "user_id,word_id",
      ignoreDuplicates: true,
    });

  if (vocabErr) {
    return errorResponse("db_error", vocabErr.message, 500);
  }

  return successResponse({ saved: true, lemma, wordId });
}

/** DELETE /api/user-vocabulary — 取消收藏单词 */
export async function DELETE(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "请先登录。", 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return errorResponse("invalid_request", "缺少 id 参数。", 400);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("db_error", "数据库未配置。", 500);
  }

  const { error } = await supabase
    .from("user_vocabulary")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return errorResponse("db_error", error.message, 500);
  }

  return successResponse({ deleted: true });
}
