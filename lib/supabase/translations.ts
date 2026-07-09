import { createSupabaseServiceClient } from "@/lib/supabase/server";
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
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("video_translations")
    .select("segments, version")
    .eq("video_id", videoId)
    .eq("language", language)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Translations] getLatest error:", error.message);
    return null;
  }
  if (!data) return null;

  return { segments: data.segments as TranscriptSegment[], version: data.version };
}

/** Get a specific version translation */
export async function getTranslation(
  videoId: string,
  language: string,
  version: number
): Promise<TranslationRecord | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("video_translations")
    .select("*")
    .eq("video_id", videoId)
    .eq("language", language)
    .eq("version", version)
    .maybeSingle();

  if (error) {
    console.error("[Translations] getTranslation error:", error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    video_id: data.video_id,
    language: data.language,
    version: data.version,
    segments: data.segments as TranscriptSegment[],
    provider: data.provider,
    model: data.model,
    quality_score: data.quality_score,
    created_at: data.created_at,
  };
}

/** Get all versions metadata (without full segments) for a video + language */
export async function getAllTranslations(
  videoId: string,
  language: string
): Promise<Pick<TranslationRecord, "id" | "version" | "provider" | "model" | "quality_score" | "created_at">[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("video_translations")
    .select("id, version, provider, model, quality_score, created_at")
    .eq("video_id", videoId)
    .eq("language", language)
    .order("version", { ascending: false });

  if (error) {
    console.error("[Translations] getAll error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Upsert a new translation version (always creates a new version) */
export async function upsertTranslation(
  videoId: string,
  language: string,
  segments: TranscriptSegment[],
  provider?: string,
  model?: string
): Promise<number | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  // Find max version for this video + language
  const { data: existing } = await supabase
    .from("video_translations")
    .select("version")
    .eq("video_id", videoId)
    .eq("language", language)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (existing?.version ?? 0) + 1;

  const { error } = await supabase
    .from("video_translations")
    .insert({
      video_id: videoId,
      language,
      version: nextVersion,
      segments,
      provider: provider ?? null,
      model: model ?? null,
    });

  if (error) {
    console.error("[Translations] upsert error:", error.message);
    return null;
  }

  return nextVersion;
}

/** Delete a specific translation version */
export async function deleteTranslation(
  videoId: string,
  language: string,
  version: number
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("video_translations")
    .delete()
    .eq("video_id", videoId)
    .eq("language", language)
    .eq("version", version);

  if (error) {
    console.error("[Translations] delete error:", error.message);
    return false;
  }
  return true;
}
