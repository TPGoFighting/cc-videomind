import { z } from "zod";
import {
  TranscriptSegmentSchema,
  VideoAnalysisSchema,
  VideoMetadataSchema,
  type TranscriptSegment,
  type VideoAnalysis,
  type VideoMetadata
} from "@/lib/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/local-mode";
import { getAnalysis, saveAnalysis } from "@/lib/db/local-store";

const CachedAnalysisSchema = z.object({
  video_id: z.string(),
  metadata: VideoMetadataSchema.nullable(),
  transcript: z.array(TranscriptSegmentSchema).nullable(),
  analysis: VideoAnalysisSchema.nullable()
});

export async function getCachedAnalysis(videoId: string) {
  if (isLocalMode()) {
    const record = await getAnalysis(videoId);
    if (!record) return null;
    const parsed = CachedAnalysisSchema.safeParse({
      video_id: record.videoId,
      metadata: record.metadata,
      transcript: record.transcript,
      analysis: record.analysis,
    });
    return parsed.success ? parsed.data : null;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("video_analyses")
    .select("video_id, metadata, transcript, analysis")
    .eq("video_id", videoId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return CachedAnalysisSchema.parse(data);
}

export async function upsertTranscriptCache(input: {
  videoId: string;
  metadata?: VideoMetadata;
  transcript: TranscriptSegment[];
}) {
  if (isLocalMode()) {
    const existing = await getAnalysis(input.videoId);
    await saveAnalysis(
      input.videoId,
      input.metadata ?? existing?.metadata ?? null,
      input.transcript,
      existing?.analysis ?? null,
    );
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase.from("video_analyses").upsert(
    {
      video_id: input.videoId,
      metadata: input.metadata,
      transcript: input.transcript,
      updated_at: new Date().toISOString()
    },
    { onConflict: "video_id" }
  );
}

export async function upsertAnalysisCache(input: {
  videoId: string;
  metadata: VideoMetadata;
  transcript: TranscriptSegment[];
  analysis: VideoAnalysis;
}) {
  if (isLocalMode()) {
    await saveAnalysis(input.videoId, input.metadata, input.transcript, input.analysis);
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase.from("video_analyses").upsert(
    {
      video_id: input.videoId,
      metadata: input.metadata,
      transcript: input.transcript,
      analysis: input.analysis,
      updated_at: new Date().toISOString()
    },
    { onConflict: "video_id" }
  );
}
