import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { isAdmin } from "@/lib/supabase/admin";
import { queryTencent } from "@/lib/tencent-db";
import { errorResponse, successResponse } from "@/lib/utils/api";
import { recordAdminAuditEventSafely } from "@/lib/product/admin-audit";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "请先登录。", 401);

  const admin = await isAdmin(userId);
  if (!admin) return errorResponse("forbidden", "仅管理员可查看。", 403);

  const result = await queryTencent<{
    video_id: string;
    metadata: Record<string, unknown> | null;
    updated_at: Date;
    parsed_by: string | null;
  }>(
    `SELECT analysis.video_id, analysis.metadata, analysis.updated_at,
            STRING_AGG(DISTINCT users.email, ', ' ORDER BY users.email) AS parsed_by
     FROM video_analyses analysis
     LEFT JOIN user_videos history ON history.video_id = analysis.video_id
     LEFT JOIN app_users users ON users.id = history.user_id
     GROUP BY analysis.video_id, analysis.metadata, analysis.updated_at
     ORDER BY analysis.updated_at DESC
     LIMIT 100`,
  );

  const videos = result.rows.map((row) => {
    const meta = row.metadata ?? {};
    return {
      videoId: row.video_id,
      title: meta.title ?? "未命名",
      thumbnail: meta.thumbnailUrl ?? null,
      channelName: meta.authorName ?? "未知频道",
      parsedAt: row.updated_at.toISOString(),
      parsedBy: row.parsed_by ?? "匿名用户",
    };
  });

  await recordAdminAuditEventSafely(userId, {
    action: "videos_viewed",
    targetType: "video",
    targetId: "latest-100",
  });

  return successResponse({ videos });
}
