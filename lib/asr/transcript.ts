import type { TranscriptSegment } from "@/lib/types";

export class AsrTranscriptError extends Error {
  constructor() {
    super("ASR response contains no valid timestamped transcript");
    this.name = "AsrTranscriptError";
  }
}

type AsrLikeResponse = {
  text?: string;
  segments?: Array<{ text?: string; start?: number; end?: number }>;
};

function cleanCaptionText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function proportionalSegments(text: string, totalDuration: number): TranscriptSegment[] {
  const chunks = text
    .split(/(?<=[。！？.!?])\s*|\n+/u)
    .map(cleanCaptionText)
    .filter(Boolean);
  if (chunks.length === 0 || !Number.isFinite(totalDuration) || totalDuration <= 0) {
    throw new AsrTranscriptError();
  }

  const totalCharacters = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  let startTime = 0;
  return chunks.map((chunk, index) => {
    const endTime = index === chunks.length - 1
      ? totalDuration
      : startTime + (chunk.length / totalCharacters) * totalDuration;
    const segment = {
      startTime: Number(startTime.toFixed(3)),
      endTime: Number(endTime.toFixed(3)),
      text: chunk,
    };
    startTime = endTime;
    return segment;
  });
}

export function transcriptFromAsrResponse(response: AsrLikeResponse, duration: number): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  for (const segment of response.segments ?? []) {
    const text = typeof segment.text === "string" ? cleanCaptionText(segment.text) : "";
    if (
      typeof segment.start !== "number" ||
      typeof segment.end !== "number" ||
      !Number.isFinite(segment.start) ||
      !Number.isFinite(segment.end) ||
      segment.start < 0 ||
      segment.end <= segment.start ||
      !text
    ) continue;
    segments.push({ startTime: segment.start, endTime: segment.end, text });
  }

  if (segments.length > 0) {
    return segments.map((segment) => ({
      startTime: Number(segment.startTime.toFixed(3)),
      endTime: Number(segment.endTime.toFixed(3)),
      text: segment.text,
    }));
  }

  const text = response.text ? cleanCaptionText(response.text) : "";
  if (!text) throw new AsrTranscriptError();
  return proportionalSegments(text, duration);
}
