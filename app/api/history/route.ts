import { listHistory } from "@/lib/db/local-store";
import { isLocalMode } from "@/lib/local-mode";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { queryTencent } from "@/lib/tencent-db";
import { successResponse } from "@/lib/utils/api";

export async function GET(request: Request) {
  if (isLocalMode()) {
    const history = await listHistory();
    return successResponse(history.map((entry) => ({
      videoId: entry.videoId, title: entry.title, thumbnail: entry.thumbnail,
      channelName: entry.author, parsedAt: entry.createdAt,
    })));
  }
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return successResponse([]);
  const result = await queryTencent<{
    video_id: string; created_at: Date; metadata: { title?: string; thumbnailUrl?: string; authorName?: string } | null;
  }>(
    `SELECT uv.video_id, uv.created_at, va.metadata
     FROM user_videos uv LEFT JOIN video_analyses va ON va.video_id = uv.video_id
     WHERE uv.user_id = $1 ORDER BY uv.created_at DESC LIMIT 50`,
    [userId],
  );
  return successResponse(result.rows.map((row) => ({
    videoId: row.video_id,
    title: row.metadata?.title ?? null,
    thumbnail: row.metadata?.thumbnailUrl ?? null,
    channelName: row.metadata?.authorName ?? null,
    parsedAt: row.created_at.toISOString(),
  })));
}
