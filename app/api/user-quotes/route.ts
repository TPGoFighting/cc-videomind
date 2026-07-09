import { SaveQuoteRequestSchema } from "@/lib/types";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { withSecurity } from "@/lib/security/middleware";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

/** GET /api/user-quotes — 获取用户收藏的句子 */
export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "请先登录。", 401);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return successResponse({ quotes: [] });
  }

  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId");

  let query = supabase
    .from("user_quotes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (videoId) query = query.eq("video_id", videoId);

  const { data } = await query;

  // 加载视频标题
  const videoIds = [...new Set((data ?? []).map((r) => r.video_id))];
  const titles = new Map<string, string>();
  if (videoIds.length > 0) {
    const { data: analyses } = await supabase
      .from("video_analyses")
      .select("video_id, metadata")
      .in("video_id", videoIds);
    for (const row of analyses ?? []) {
      const meta = row.metadata as { title?: string } | null;
      if (meta?.title) titles.set(row.video_id, meta.title);
    }
  }

  const quotes = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    videoId: row.video_id as string,
    textEn: row.text_en as string,
    textZh: row.text_zh as string | undefined,
    startTime: row.start_time as number,
    endTime: row.end_time as number,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    videoTitle: titles.get(row.video_id as string),
  }));

  return successResponse({ quotes });
}

/** POST /api/user-quotes — 收藏句子 */
export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 32 * 1024,
    scope: "user-quotes",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => {
    const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "请先登录。", 401);
  }

  const parsed = await readJson(request, SaveQuoteRequestSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("db_error", "数据库未配置。", 500);
  }

  const { videoId, textEn, textZh, startTime, endTime, notes } = parsed.data;

  const { data, error } = await supabase
    .from("user_quotes")
    .insert({
      user_id: userId,
      video_id: videoId,
      text_en: textEn,
      text_zh: textZh ?? null,
      start_time: startTime,
      end_time: endTime,
      notes: notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return errorResponse("db_error", error.message, 500);
  }

  return successResponse({ saved: true, id: data.id });
});
}

/** DELETE /api/user-quotes — 删除收藏的句子 */
export async function DELETE(request: Request) {
  return withSecurity({
    allowedMethods: ["DELETE"],
    maxBodySize: 16 * 1024,
    scope: "user-quotes",
  }).wrap(request, async () => {
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
    .from("user_quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return errorResponse("db_error", error.message, 500);
  }

  return successResponse({ deleted: true });
});
}
