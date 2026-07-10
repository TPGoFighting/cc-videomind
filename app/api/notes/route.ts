import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { VideoIdSchema } from "@/lib/youtube/id";
import { isLocalMode } from "@/lib/local-mode";
import { deleteNote, getAnalysis, getNotes, saveNote } from "@/lib/db/local-store";

const SaveRequestSchema = z.object({
  videoId: VideoIdSchema,
  body: z.string().min(1).max(10000),
  timestampSeconds: z.number().nonnegative().optional()
});

const DeleteRequestSchema = z.object({
  noteId: z.string().uuid()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (isLocalMode()) {
    if (videoId && !VideoIdSchema.safeParse(videoId).success) {
      return errorResponse("invalid_video_id", "Invalid videoId.", 400);
    }
    const notes = await getNotes(videoId ?? undefined);
    return successResponse(notes.map((note) => ({
      id: note.id,
      video_id: note.videoId,
      body: note.body,
      timestamp_seconds: note.timestampSeconds,
      created_at: note.createdAt,
      video_title: note.videoTitle ?? undefined,
    })));
  }

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "Sign in to view notes.", 401);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("supabase_not_configured", "Supabase is not configured.", 503);
  }

  let query = supabase
    .from("user_notes")
    .select("id, body, timestamp_seconds, created_at, video_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (videoId) {
    const parsed = VideoIdSchema.safeParse(videoId);
    if (!parsed.success) {
      return errorResponse("invalid_video_id", "Invalid videoId.", 400);
    }
    query = query.eq("video_id", parsed.data);
  }

  const { data, error } = await query;

  if (error) {
    return errorResponse("notes_fetch_failed", "Could not fetch notes.", 500);
  }

  // 加载视频标题
  const videoIds = [...new Set((data ?? []).map((r: Record<string, unknown>) => r.video_id as string))];
  const titles = new Map<string, string>();
  if (videoIds.length > 0) {
    const { data: analyses } = await supabase
      .from("video_analyses")
      .select("video_id, metadata")
      .in("video_id", videoIds);
    for (const row of analyses ?? []) {
      const meta = row.metadata as { title?: string } | null;
      if (meta?.title) titles.set(row.video_id as string, meta.title);
    }
  }

  const notes = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    video_id: row.video_id as string,
    body: row.body as string,
    timestamp_seconds: row.timestamp_seconds as number | null | undefined,
    created_at: row.created_at as string,
    video_title: titles.get(row.video_id as string),
  }));

  return successResponse(notes);
}

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 64 * 1024,
    scope: "notes",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => {
      const parsed = await readJson(request, SaveRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  if (isLocalMode()) {
    const cached = await getAnalysis(parsed.data.videoId);
    const id = await saveNote({
      videoId: parsed.data.videoId,
      body: parsed.data.body,
      timestampSeconds: parsed.data.timestampSeconds,
      videoTitle: cached?.metadata?.title ?? null,
    });
    const createdAt = new Date().toISOString();
    return successResponse({
      id,
      video_id: parsed.data.videoId,
      body: parsed.data.body,
      timestamp_seconds: parsed.data.timestampSeconds ?? null,
      created_at: createdAt,
      video_title: cached?.metadata?.title ?? undefined,
    });
  }

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "Sign in to save notes.", 401);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("supabase_not_configured", "Supabase is not configured.", 503);
  }

  const { data, error } = await supabase
    .from("user_notes")
    .insert({
      user_id: userId,
      video_id: parsed.data.videoId,
      body: parsed.data.body,
      timestamp_seconds: parsed.data.timestampSeconds
    })
    .select("id, body, timestamp_seconds, created_at, video_id")
    .single();

  if (error) {
    return errorResponse("note_save_failed", "Note could not be saved.", 500);
  }

  return successResponse(data);
});
}

export async function DELETE(request: Request) {
  return withSecurity({
    allowedMethods: ["DELETE"],
    maxBodySize: 16 * 1024,
    scope: "notes",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => {
      const parsed = await readJson(request, DeleteRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  if (isLocalMode()) {
    await deleteNote(parsed.data.noteId);
    return successResponse({ deleted: true });
  }

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "Sign in to delete notes.", 401);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("supabase_not_configured", "Supabase is not configured.", 503);
  }

  const { error } = await supabase
    .from("user_notes")
    .delete()
    .eq("id", parsed.data.noteId)
    .eq("user_id", userId);

  if (error) {
    return errorResponse("note_delete_failed", "Could not delete note.", 500);
  }

  return successResponse({ deleted: true });
});
}
