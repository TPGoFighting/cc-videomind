import type { TranscriptSegment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";

export function transcriptForPrompt(segments: TranscriptSegment[]) {
  const maxChars = 60_000;
  let totalChars = 0;
  const selectedSegments: TranscriptSegment[] = [];

  for (const segment of selectPromptSegments(segments)) {
    const nextLength = segment.text.length + 24;
    if (totalChars + nextLength > maxChars) {
      break;
    }

    selectedSegments.push(segment);
    totalChars += nextLength;
  }

  return selectedSegments
    .map((segment) => `[${formatTimestamp(segment.startTime)}-${formatTimestamp(segment.endTime)}] ${segment.text}`)
    .join("\n");
}

function selectPromptSegments(segments: TranscriptSegment[]) {
  if (segments.length <= 220) {
    return segments;
  }

  const head = segments.slice(0, 120);
  const middleStart = Math.max(120, Math.floor(segments.length / 2) - 40);
  const middle = segments.slice(middleStart, middleStart + 80);
  const tail = segments.slice(-50);
  return [...head, ...middle, ...tail];
}

export function buildAnalysisPrompt(title: string, segments: TranscriptSegment[]) {
  return [
    "You are VideoMind, a careful learning assistant.",
    "Use only the transcript. Do not invent quotes, claims, or timestamps.",
    "Return strict JSON with: summary, takeaways, suggestedQuestions, highlights.",
    "Highlights must contain 5 to 8 items with startTime, endTime, title, quote, and reason.",
    "Use numeric seconds for timestamps.",
    `Video title: ${title}`,
    "Transcript:",
    transcriptForPrompt(segments)
  ].join("\n\n");
}

export function buildSummaryPrompt(title: string, segments: TranscriptSegment[]) {
  return [
    "Summarize this video for a student. Use only the transcript.",
    "Return strict JSON with summary and takeaways.",
    `Video title: ${title}`,
    transcriptForPrompt(segments)
  ].join("\n\n");
}

export function buildChatPrompt(question: string, segments: TranscriptSegment[]) {
  return [
    "Answer the question using only the transcript.",
    "Return strict JSON with answer and citations. Citations must include timestamp ranges and exact short quotes from the transcript.",
    `Question: ${question}`,
    transcriptForPrompt(segments)
  ].join("\n\n");
}
