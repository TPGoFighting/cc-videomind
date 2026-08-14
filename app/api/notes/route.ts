import { randomUUID } from "node:crypto";
import { z } from "zod";
import { deleteNote, getAnalysis, getNotes, saveNote } from "@/lib/db/local-store";
import { isLocalMode } from "@/lib/local-mode";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { queryTencent } from "@/lib/tencent-db";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { VideoIdSchema } from "@/lib/youtube/id";

const SaveRequestSchema = z.object({ videoId: VideoIdSchema, body: z.string().min(1).max(10_000), timestampSeconds: z.number().nonnegative().optional() });
const DeleteRequestSchema = z.object({ noteId: z.string().uuid() });

export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId") ?? undefined;
  if (videoId && !VideoIdSchema.safeParse(videoId).success) return errorResponse("invalid_video_id", "Invalid videoId.", 400);
  if (isLocalMode()) {
    const notes = await getNotes(videoId);
    return successResponse(notes.map((note) => ({ id: note.id, video_id: note.videoId, body: note.body, timestamp_seconds: note.timestampSeconds, created_at: note.createdAt, video_title: note.videoTitle ?? undefined })));
  }
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "Sign in to view notes.", 401);
  const result = await queryTencent<{ id: string; video_id: string; body: string; timestamp_seconds: number | null; created_at: Date; metadata: { title?: string } | null }>(
    `SELECT n.*, va.metadata FROM user_notes n LEFT JOIN video_analyses va ON va.video_id = n.video_id
     WHERE n.user_id = $1 ${videoId ? "AND n.video_id = $2" : ""} ORDER BY n.created_at DESC LIMIT 200`,
    videoId ? [userId, videoId] : [userId],
  );
  return successResponse(result.rows.map((note) => ({
    id: note.id, video_id: note.video_id, body: note.body, timestamp_seconds: note.timestamp_seconds,
    created_at: note.created_at.toISOString(), video_title: note.metadata?.title,
  })));
}

export async function POST(request: Request) {
  return withSecurity({ allowedMethods: ["POST"], maxBodySize: 64 * 1024, scope: "notes", rateLimit: { maxRequests: 30, windowMs: 60_000 } }).wrap(request, async () => {
    const parsed = await readJson(request, SaveRequestSchema);
    if (!parsed.ok) return parsed.response;
    if (isLocalMode()) {
      const cached = await getAnalysis(parsed.data.videoId);
      const id = await saveNote({ videoId: parsed.data.videoId, body: parsed.data.body, timestampSeconds: parsed.data.timestampSeconds, videoTitle: cached?.metadata?.title ?? null });
      return successResponse({ id, video_id: parsed.data.videoId, body: parsed.data.body, timestamp_seconds: parsed.data.timestampSeconds ?? null, created_at: new Date().toISOString(), video_title: cached?.metadata?.title ?? undefined });
    }
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "Sign in to save notes.", 401);
    const id = randomUUID();
    const result = await queryTencent<{ created_at: Date }>(
      `INSERT INTO user_notes (id, user_id, video_id, body, timestamp_seconds) VALUES ($1, $2, $3, $4, $5) RETURNING created_at`,
      [id, userId, parsed.data.videoId, parsed.data.body, parsed.data.timestampSeconds ?? null],
    );
    return successResponse({ id, video_id: parsed.data.videoId, body: parsed.data.body, timestamp_seconds: parsed.data.timestampSeconds ?? null, created_at: result.rows[0].created_at.toISOString() });
  });
}

export async function DELETE(request: Request) {
  return withSecurity({ allowedMethods: ["DELETE"], maxBodySize: 16 * 1024, scope: "notes", rateLimit: { maxRequests: 30, windowMs: 60_000 } }).wrap(request, async () => {
    const parsed = await readJson(request, DeleteRequestSchema);
    if (!parsed.ok) return parsed.response;
    if (isLocalMode()) { await deleteNote(parsed.data.noteId); return successResponse({ deleted: true }); }
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "Sign in to delete notes.", 401);
    await queryTencent(`DELETE FROM user_notes WHERE id = $1 AND user_id = $2`, [parsed.data.noteId, userId]);
    return successResponse({ deleted: true });
  });
}
