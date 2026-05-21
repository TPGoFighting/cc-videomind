import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { isAdmin } from "@/lib/supabase/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/utils/api";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "请先登录。", 401);

  const admin = await isAdmin(userId);
  if (!admin) return errorResponse("forbidden", "仅管理员可查看。", 403);

  const supabase = createSupabaseServiceClient();
  if (!supabase) return errorResponse("supabase_not_configured", "Supabase not configured.", 503);

  // 查询所有用户解析过的视频
  const { data: rows, error } = await supabase
    .from("user_videos")
    .select("video_id, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !rows?.length) return successResponse({ videos: [] });

  // 去重取每个 video_id 最新的一条
  const seen = new Set<string>();
  const unique: { video_id: string; user_id: string; created_at: string }[] = [];
  for (const r of rows) {
    const vid = r.video_id as string;
    if (!seen.has(vid)) {
      seen.add(vid);
      unique.push({ video_id: vid, user_id: r.user_id as string, created_at: r.created_at as string });
    }
  }

  // 批量查用户邮箱
  const userIds = [...new Set(unique.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);
  const emailMap = new Map<string, string>();
  for (const p of (profiles ?? [])) {
    emailMap.set(p.id as string, p.email as string);
  }

  // 获取视频元数据
  const videoIds = unique.map((r) => r.video_id);
  const { data: analyses } = await supabase
    .from("video_analyses")
    .select("video_id, metadata")
    .in("video_id", videoIds);

  const metaMap = new Map<string, Record<string, unknown>>();
  for (const a of analyses ?? []) {
    metaMap.set(a.video_id as string, (a.metadata as Record<string, unknown>) ?? {});
  }

  const videos = unique.map((r) => {
    const meta = metaMap.get(r.video_id) ?? {};
    return {
      videoId: r.video_id,
      title: meta.title ?? "未命名",
      thumbnail: meta.thumbnailUrl ?? null,
      channelName: meta.authorName ?? "未知频道",
      parsedAt: r.created_at,
      parsedBy: emailMap.get(r.user_id) ?? "未知用户",
    };
  });

  return successResponse({ videos });
}
