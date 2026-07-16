import type { ComprehensiveAnalysis } from "@/lib/ai/provider";
import type { VideoAnalysis } from "@/lib/types";

function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

/**
 * Makes historical `video_analyses.analysis` rows usable by newer panels.
 * It intentionally derives from stored data instead of invoking the model.
 */
export function deriveComprehensiveFromAnalysis(analysis: VideoAnalysis): ComprehensiveAnalysis {
  return {
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
  };
}
