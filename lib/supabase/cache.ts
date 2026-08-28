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
import { normalizeAnalysisForCache } from "@/lib/utils/video-analysis-cache";

/** Older cache rows stored missing optional URLs as empty strings. */
export function normalizeLegacyMetadata(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  const metadata = { ...(value as Record<string, unknown>) };
  for (const field of ["thumbnailUrl", "providerUrl"]) {
    if (metadata[field] === "") delete metadata[field];
  }
  return metadata;
}

/** Older model rows may contain zero-length highlight ranges. */
export function normalizeLegacyVideoAnalysis(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const analysis = { ...(value as Record<string, unknown>) };
  if (!Array.isArray(analysis.highlights)) return analysis;

  analysis.highlights = analysis.highlights.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const highlight = { ...(item as Record<string, unknown>) };
    const startTime = typeof highlight.startTime === "number" && Number.isFinite(highlight.startTime)
      ? Math.max(0, highlight.startTime)
      : 0;
    const endTime = typeof highlight.endTime === "number" && Number.isFinite(highlight.endTime)
      && highlight.endTime > startTime
      ? highlight.endTime
      : startTime + 1;
    return { ...highlight, startTime, endTime };
  });
  return analysis;
}

const CachedAnalysisSchema = z.object({
  video_id: z.string(),
  metadata: z.preprocess(normalizeLegacyMetadata, VideoMetadataSchema.nullable()),
  transcript: z.array(TranscriptSegmentSchema).nullable(),
  analysis: z.preprocess(normalizeLegacyVideoAnalysis, VideoAnalysisSchema.nullable())
});

/** Older local rows encoded an absent analysis as `{}` rather than `null`. */
export function normalizeLegacyEmptyAnalysis(value: unknown): unknown | null {
  return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0
    ? null
    : value;
}

export async function getCachedAnalysis(videoId: string) {
  if (isLocalMode()) {
    const record = await getAnalysis(videoId);
    if (!record) return null;
    const parsed = CachedAnalysisSchema.safeParse({
      video_id: record.videoId,
      metadata: record.metadata,
      transcript: record.transcript,
      analysis: normalizeLegacyEmptyAnalysis(record.analysis),
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
  const analysis = normalizeAnalysisForCache(input.analysis, input.transcript);
  if (isLocalMode()) {
    await saveAnalysis(input.videoId, input.metadata, input.transcript, analysis);
    return;
  }

  await queryTencent(
    `INSERT INTO video_analyses (video_id, metadata, transcript, analysis, updated_at)
     VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, NOW())
     ON CONFLICT (video_id) DO UPDATE SET
       metadata = EXCLUDED.metadata, transcript = EXCLUDED.transcript, analysis = EXCLUDED.analysis, updated_at = NOW()`,
    [input.videoId, JSON.stringify(input.metadata), JSON.stringify(input.transcript), JSON.stringify(analysis)],
  );
}
