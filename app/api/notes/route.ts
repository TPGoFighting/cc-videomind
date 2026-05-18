import { z } from "zod";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { VideoIdSchema } from "@/lib/youtube/id";

const RequestSchema = z.object({
  videoId: VideoIdSchema,
  body: z.string().min(1).max(10000),
  timestampSeconds: z.number().nonnegative().optional()
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request, "notes"), 30, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many note updates. Try again shortly.", 429);
  }

  const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const userId = await getAuthenticatedUserId();
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
    .select("id, body, timestamp_seconds, created_at")
    .single();

  if (error) {
    return errorResponse("note_save_failed", "Note could not be saved.", 500);
  }

  return successResponse(data);
}
