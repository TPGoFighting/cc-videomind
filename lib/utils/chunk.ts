import type { TranscriptSegment } from "@/lib/types";

export interface ChunkOptions {
  /** 每个 chunk 的目标时长（分钟），默认 5 */
  chunkMinutes: number;
  /** chunk 之间的重叠时长（秒），默认 45 */
  overlapSeconds: number;
  /** 最小分段数，低于此数不切片，默认 3 */
  minChunkSegments: number;
}

export interface TranscriptChunk {
  index: number;
  segments: TranscriptSegment[];
  startTime: number;
  endTime: number;
}

/**
 * 将字幕按时间切片
 * 按累计时间切片（非段数），保证重叠、末帧完整
 */
export function chunkTranscript(
  segments: TranscriptSegment[],
  options?: Partial<ChunkOptions>
): TranscriptChunk[] {
  const { chunkMinutes, overlapSeconds, minChunkSegments } = {
    chunkMinutes: 5,
    overlapSeconds: 45,
    minChunkSegments: 3,
    ...options
  };

  if (segments.length === 0) return [];
  if (segments.length < minChunkSegments * 2) {
    return [
      {
        index: 0,
        segments: [...segments],
        startTime: segments[0].startTime,
        endTime: segments[segments.length - 1].endTime
      }
    ];
  }

  const chunkSeconds = chunkMinutes * 60;
  const chunks: TranscriptChunk[] = [];
  let chunkIndex = 0;
  let pos = 0;

  while (pos < segments.length) {
    const chunkStartTime = segments[pos].startTime;
    const targetEnd = chunkStartTime + chunkSeconds;

    // 找到目标结束位置
    let endPos = pos;
    while (endPos < segments.length && segments[endPos].endTime <= targetEnd) {
      endPos++;
    }
    // 至少包含 minChunkSegments 段
    endPos = Math.max(endPos, pos + minChunkSegments);
    endPos = Math.min(endPos, segments.length);

    const chunkSegments = segments.slice(pos, endPos);
    chunks.push({
      index: chunkIndex,
      segments: chunkSegments,
      startTime: chunkSegments[0].startTime,
      endTime: chunkSegments[chunkSegments.length - 1].endTime
    });

    if (endPos >= segments.length) break;

    // 找到下一个 chunk 的起始位置（往回退 overlapSeconds）
    const overlapStart = chunkSegments[chunkSegments.length - 1].endTime - overlapSeconds;
    let nextPos = endPos - 1;
    while (nextPos > pos && segments[nextPos].startTime > overlapStart) {
      nextPos--;
    }
    pos = Math.max(nextPos, pos + 1);
    chunkIndex++;
  }

  return chunks;
}

/** 估算字幕总时长（秒） */
export function totalDuration(segments: TranscriptSegment[]): number {
  if (segments.length === 0) return 0;
  return segments[segments.length - 1].endTime - segments[0].startTime;
}
