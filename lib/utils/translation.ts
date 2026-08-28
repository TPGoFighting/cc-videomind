import type { TranscriptSegment } from "@/lib/types";

function canKeepSourceText(source: string): boolean {
  const normalized = source.trim();
  if (!normalized || normalized.length > 48) return false;
  if (/^\[[^\]\n]{1,44}\]$/.test(normalized)) return true;
  return /^[A-Z][A-Za-z0-9]*(?:[-'.][A-Za-z0-9]+)*$/.test(normalized);
}

export function hasUsableTranslation(segment: TranscriptSegment): boolean {
  const source = segment.text.trim();
  const translated = segment.text_zh?.trim();
  return Boolean(translated && (translated !== source || canKeepSourceText(source)));
}

/** Whether at least one segment can be rendered in the requested language. */
export function hasDisplayableTranslation(segments: TranscriptSegment[]): boolean {
  return segments.some(hasUsableTranslation);
}

/**
 * A translation is only complete when every source segment has real translated
 * content. This prevents failed batches that echo the source text from being
 * cached and presented as a successful Chinese translation.
 */
export function hasCompleteTranslation(segments: TranscriptSegment[]): boolean {
  return segments.length > 0 && segments.every(hasUsableTranslation);
}

/**
 * Reapply only real cached translations to the current source transcript.
 * Failed historical batches sometimes persist `text_zh === text`; those are
 * source fallbacks, not translations, and must neither satisfy completeness
 * nor block a later retry when no usable cached translation exists.
 */
export function mergeCachedTranslation(
  sourceSegments: TranscriptSegment[],
  cachedSegments: TranscriptSegment[],
): TranscriptSegment[] {
  const cachedByStartTime = new Map(
    cachedSegments.map((segment) => [segment.startTime, segment]),
  );

  return sourceSegments.map((source) => {
    const cached = cachedByStartTime.get(source.startTime);
    const translated = cached?.text_zh?.trim();
    return translated && (translated !== source.text.trim() || canKeepSourceText(source.text))
      ? { ...source, text_zh: translated }
      : source;
  });
}
