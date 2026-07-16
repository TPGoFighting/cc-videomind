import type { TranscriptSegment } from "@/lib/types";

function isUsableTranslation(segment: TranscriptSegment): boolean {
  const translated = segment.text_zh?.trim();
  return Boolean(translated && translated !== segment.text.trim());
}

/** Whether at least one segment can be rendered in the requested language. */
export function hasDisplayableTranslation(segments: TranscriptSegment[]): boolean {
  return segments.some(isUsableTranslation);
}

/**
 * A translation is only complete when every source segment has real translated
 * content. This prevents failed batches that echo the source text from being
 * cached and presented as a successful Chinese translation.
 */
export function hasCompleteTranslation(segments: TranscriptSegment[]): boolean {
  return segments.length > 0 && segments.every(isUsableTranslation);
}
