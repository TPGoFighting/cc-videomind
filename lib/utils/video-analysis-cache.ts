import type { TranscriptSegment, VideoAnalysis } from "@/lib/types";

type AnalysisCacheRecord = {
  metadata: unknown | null | undefined;
  transcript: unknown | null | undefined;
  analysis: unknown | null | undefined;
};

/**
 * Model responses occasionally use an inclusive or zero-length highlight end.
 * Keep the source position usable while satisfying the shared cache contract.
 */
export function normalizeAnalysisForCache(
  analysis: VideoAnalysis,
  transcript: TranscriptSegment[],
): VideoAnalysis {
  return {
    ...analysis,
    highlights: analysis.highlights.map((highlight) => {
      const startTime = Math.max(0, highlight.startTime);
      const matchingSegment = transcript.find(
        (segment) => Math.abs(segment.startTime - startTime) <= 0.25,
      );
      const endTime = highlight.endTime > startTime
        ? highlight.endTime
        : Math.max(startTime + 0.5, matchingSegment?.endTime ?? startTime + 1);
      return { ...highlight, startTime, endTime };
    }),
  };
}

export function hasReusableVideoAnalysis(
  record: AnalysisCacheRecord | null | undefined,
): record is AnalysisCacheRecord & {
  metadata: NonNullable<AnalysisCacheRecord["metadata"]>;
  transcript: NonNullable<AnalysisCacheRecord["transcript"]>;
  analysis: NonNullable<AnalysisCacheRecord["analysis"]>;
} {
  return Boolean(record?.metadata && record.transcript && record.analysis);
}
