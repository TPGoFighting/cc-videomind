import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const { data: rows } = await supabase
    .from("user_videos")
    .select("video_id, created_at, video_analyses!inner(metadata)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const history = (rows ?? []).map((row: Record<string, unknown>) => {
    const analyses = row.video_analyses as { metadata: { title?: string; thumbnail?: string; channelName?: string } } | null;
    return {
      videoId: row.video_id as string,
      title: analyses?.metadata?.title ?? null,
      thumbnail: analyses?.metadata?.thumbnail ?? null,
      channelName: analyses?.metadata?.channelName ?? null,
      parsedAt: row.created_at as string,
    };
  });

  return NextResponse.json({ ok: true, data: history });
}
