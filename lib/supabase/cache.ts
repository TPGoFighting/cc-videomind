import { z } from "zod";
import {
  TranscriptSegmentSchema,
  VideoAnalysisSchema,
  VideoMetadataSchema,
  type TranscriptSegment,
  type VideoAnalysis,
  type VideoMetadata
} from "@/lib/types";
import { isLocalMode } from "@/lib/local-mode";
import { getAnalysis, saveAnalysis } from "@/lib/db/local-store";
import { queryTencent } from "@/lib/tencent-db";

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

  const result = await queryTencent<{
    video_id: string;
    metadata: unknown;
    transcript: unknown;
    analysis: unknown;
  }>(`SELECT video_id, metadata, transcript, analysis FROM video_analyses WHERE video_id = $1`, [videoId]);
  const data = result.rows[0];
  if (!data) return null;
  const parsed = CachedAnalysisSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
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

  await queryTencent(
    `INSERT INTO video_analyses (video_id, metadata, transcript, updated_at)
     VALUES ($1, $2::jsonb, $3::jsonb, NOW())
     ON CONFLICT (video_id) DO UPDATE SET metadata = EXCLUDED.metadata, transcript = EXCLUDED.transcript, updated_at = NOW()`,
    [input.videoId, JSON.stringify(input.metadata ?? null), JSON.stringify(input.transcript)],
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

  await queryTencent(
    `INSERT INTO video_analyses (video_id, metadata, transcript, analysis, updated_at)
     VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, NOW())
     ON CONFLICT (video_id) DO UPDATE SET
       metadata = EXCLUDED.metadata, transcript = EXCLUDED.transcript, analysis = EXCLUDED.analysis, updated_at = NOW()`,
    [input.videoId, JSON.stringify(input.metadata), JSON.stringify(input.transcript), JSON.stringify(input.analysis)],
  );
}
