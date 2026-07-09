import { query } from "@/lib/db";
import type { TranscriptSegment } from "@/lib/types";

interface TranslationRecord {
  id: string;
  video_id: string;
  language: string;
  version: number;
  segments: TranscriptSegment[];
  provider: string | null;
  model: string | null;
  quality_score: number | null;
  created_at: string;
}

/** Get the latest translation version for a video + language */
export async function getLatestTranslation(
  videoId: string,
  language: string
): Promise<{ segments: TranscriptSegment[]; version: number } | null> {
  const { rows } = await query<{ segments: TranscriptSegment[]; version: number }>(
    `SELECT segments, version FROM video_translations
     WHERE video_id = $1 AND language = $2
     ORDER BY version DESC LIMIT 1`,
    [videoId, language]
  );
  return rows[0] ?? null;
}

/** Get a specific version translation */
export async function getTranslation(
  videoId: string,
  language: string,
  version: number
): Promise<TranslationRecord | null> {
  const { rows } = await query<TranslationRecord>(
    `SELECT * FROM video_translations
     WHERE video_id = $1 AND language = $2 AND version = $3`,
    [videoId, language, version]
  );
  return rows[0] ?? null;
}

/** Get all versions metadata for a video + language */
export async function getAllTranslations(
  videoId: string,
  language: string
): Promise<Pick<TranslationRecord, "id" | "version" | "provider" | "model" | "quality_score" | "created_at">[]> {
  const { rows } = await query(
    `SELECT id, version, provider, model, quality_score, created_at
     FROM video_translations
     WHERE video_id = $1 AND language = $2
     ORDER BY version DESC`,
    [videoId, language]
  );
  return rows;
}

/** Upsert a new translation version (always creates a new version) */
export async function upsertTranslation(
  videoId: string,
  language: string,
  segments: TranscriptSegment[],
  provider?: string,
  model?: string
): Promise<number | null> {
  // Find max version
  const { rows: existing } = await query<{ version: number }>(
    `SELECT version FROM video_translations
     WHERE video_id = $1 AND language = $2
     ORDER BY version DESC LIMIT 1`,
    [videoId, language]
  );
  const nextVersion = (existing[0]?.version ?? 0) + 1;

  const { rows } = await query<{ version: number }>(
    `INSERT INTO video_translations (video_id, language, version, segments, provider, model)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING version`,
    [videoId, language, nextVersion, JSON.stringify(segments), provider ?? null, model ?? null]
  );

  return rows[0]?.version ?? null;
}

/** Delete a specific translation version */
export async function deleteTranslation(
  videoId: string,
  language: string,
  version: number
): Promise<boolean> {
  const { rowCount } = await query(
    `DELETE FROM video_translations
     WHERE video_id = $1 AND language = $2 AND version = $3`,
    [videoId, language, version]
  );
  return (rowCount ?? 0) > 0;
}
