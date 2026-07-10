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

const CachedAnalysisSchema = z.object({
  video_id: z.string(),
  metadata: VideoMetadataSchema.nullable(),
  transcript: z.array(TranscriptSegmentSchema).nullable(),
  analysis: VideoAnalysisSchema.nullable()
});

export async function getCachedAnalysis(videoId: string) {
  // LOCAL_MODE：本地缓存由数据层 Agent 通过 lib/db/local-store.ts 实现，此处先返回 null（无缓存）
  // TODO(local-store): 改为读取 lib/db/local-store.ts 的本地 video_analyses 缓存
  if (isLocalMode()) {
    return null;
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
  // LOCAL_MODE：本地缓存由数据层 Agent 通过 lib/db/local-store.ts 实现，此处先 no-op
  // TODO(local-store): 改为写入 lib/db/local-store.ts 的本地 video_analyses 缓存
  if (isLocalMode()) {
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
  // LOCAL_MODE：本地缓存由数据层 Agent 通过 lib/db/local-store.ts 实现，此处先 no-op
  // TODO(local-store): 改为写入 lib/db/local-store.ts 的本地 video_analyses 缓存
  if (isLocalMode()) {
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
