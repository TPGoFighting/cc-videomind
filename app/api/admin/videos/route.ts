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

  // 直接从 video_analyses 查所有已解析视频（含未登录用户）
  const { data: analyses, error } = await supabase
    .from("video_analyses")
    .select("video_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !analyses?.length) return successResponse({ videos: [] });

  // 查哪些用户解析过这些视频
  const videoIds = analyses.map((a: Record<string, unknown>) => a.video_id as string);
  const { data: userRows } = await supabase
    .from("user_videos")
    .select("user_id, video_id")
    .in("video_id", videoIds);

  const videoUserMap = new Map<string, string[]>();
  const userIdSet = new Set<string>();
  for (const r of (userRows ?? [])) {
    const vid = r.video_id as string;
    const uid = r.user_id as string;
    if (!videoUserMap.has(vid)) videoUserMap.set(vid, []);
    videoUserMap.get(vid)!.push(uid);
    userIdSet.add(uid);
  }

  // 查用户邮箱
  const emailMap = new Map<string, string>();
  if (userIdSet.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", [...userIdSet]);
    for (const p of (profiles ?? [])) {
      emailMap.set(p.id as string, p.email as string);
    }
  }

  const videos = analyses.map((a: Record<string, unknown>) => {
    const meta = (a.metadata as Record<string, unknown>) ?? {};
    const vid = a.video_id as string;
    const users = videoUserMap.get(vid) ?? [];
    const parsedBy = users.length > 0
      ? users.map((uid) => emailMap.get(uid) ?? uid.slice(0, 8) + "...").join(", ")
      : "匿名用户";
    return {
      videoId: vid,
      title: meta.title ?? "未命名",
      thumbnail: meta.thumbnailUrl ?? null,
      channelName: meta.authorName ?? "未知频道",
      parsedAt: a.created_at,
      parsedBy,
    };
  });

  return successResponse({ videos });
}
