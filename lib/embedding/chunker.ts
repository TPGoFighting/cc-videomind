import type { TranscriptSegment } from "@/lib/types";

export interface TranscriptChunk {
  chunkIndex: number;
  segmentStart: number;
  segmentEnd: number;
  text: string;
}

/**
 * Group transcript segments into overlapping chunks for embedding.
 * Each chunk: 3-5 consecutive segments, 1 segment overlap.
 * Target: ~200-400 tokens per chunk.
 */
export function chunkTranscript(segments: TranscriptSegment[]): TranscriptChunk[] {
  if (segments.length === 0) return [];

  const chunks: TranscriptChunk[] = [];
  const chunkSize = 4; // segments per chunk
  const overlap = 1;   // overlapping segments
  const step = chunkSize - overlap;

  let i = 0;
  let chunkIndex = 0;

  while (i < segments.length) {
    const end = Math.min(i + chunkSize, segments.length);
    const chunkSegments = segments.slice(i, end);

    if (chunkSegments.length === 0) break;

    chunks.push({
      chunkIndex,
      segmentStart: i,
      segmentEnd: end - 1,
      text: chunkSegments.map(s => s.text).join(" "),
    });

    chunkIndex++;

    if (end >= segments.length) break;
    i += step;
  }

  return chunks;
}
