import type { ComprehensiveAnalysis } from "@/lib/ai/provider";
import type { VideoAnalysis } from "@/lib/types";

function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function parseTimestampRange(value: string): [number, number] | null {
  const parts = value.split("-");
  if (parts.length !== 2) return null;
  const parse = (timestamp: string) => {
    const values = timestamp.split(":").map(Number);
    if (values.some((item) => !Number.isFinite(item))) return null;
    if (values.length === 2) return values[0] * 60 + values[1];
    if (values.length === 3) return values[0] * 3600 + values[1] * 60 + values[2];
    return null;
  };
  const start = parse(parts[0]);
  const end = parse(parts[1]);
  return start !== null && end !== null && end > start ? [start, end] : null;
}

/**
 * Historical and compatibility-model results can contain zero-length ranges.
 * Keep the text result while making every seek target usable in the workspace.
 */
export function normalizeComprehensiveForCache(
  result: ComprehensiveAnalysis,
): ComprehensiveAnalysis {
  const highlights = result.highlights.map((highlight) => {
    const startTime = Number.isFinite(highlight.startTime) ? Math.max(0, highlight.startTime) : 0;
    const endTime = Number.isFinite(highlight.endTime) && highlight.endTime > startTime
      ? highlight.endTime
      : startTime + 1;
    return { ...highlight, startTime, endTime };
  });

  const moments = result.moments.map((moment, index) => {
    if (parseTimestampRange(moment.timestamp)) return moment;
    const fallback = highlights[index] ?? highlights[0];
    if (!fallback) return moment;
    return {
      ...moment,
      timestamp: `${formatTimestamp(fallback.startTime)}-${formatTimestamp(fallback.endTime)}`,
    };
  });

  return { ...result, highlights, moments };
}

/**
 * Makes historical `video_analyses.analysis` rows usable by newer panels.
 * It intentionally derives from stored data instead of invoking the model.
 */
export function deriveComprehensiveFromAnalysis(analysis: VideoAnalysis): ComprehensiveAnalysis {
  return normalizeComprehensiveForCache({
    summary: analysis.summary,
    takeaways: analysis.takeaways.map((insight, index) => ({
      label: `要点 ${index + 1}`,
      label_zh: `要点 ${index + 1}`,
      insight,
      insight_zh: insight,
      timestamps: [],
    })),
    moments: analysis.highlights.map((highlight) => ({
      title: highlight.title,
      title_zh: highlight.title,
      timestamp: `${formatTimestamp(highlight.startTime)}-${formatTimestamp(highlight.endTime)}`,
      quote: highlight.quote,
      quote_zh: highlight.quote,
      reason: highlight.reason,
      reason_zh: highlight.reason,
    })),
    highlights: analysis.highlights,
    suggestedQuestions: analysis.suggestedQuestions,
  });
}
