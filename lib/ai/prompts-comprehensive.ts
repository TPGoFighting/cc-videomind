import type { TranscriptSegment } from "@/lib/types";

function transcriptForSummaryPrompt(
  segments: TranscriptSegment[],
  maxChars = 20_000
): string {
  let totalChars = 0;
  const selected: TranscriptSegment[] = [];

  for (const segment of selectSegments(segments)) {
    const lineLength = segment.text.length + 1;
    if (totalChars + lineLength > maxChars) break;
    selected.push(segment);
    totalChars += lineLength;
  }

  return selected.map((s) => s.text).join("\n");
}

function selectSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (segments.length <= 250) return segments;
  const head = segments.slice(0, 130);
  const midStart = Math.max(130, Math.floor(segments.length / 2) - 50);
  const middle = segments.slice(midStart, midStart + 90);
  const tail = segments.slice(-60);
  return [...head, ...middle, ...tail];
}

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildComprehensivePrompt(
  title: string,
  segments: TranscriptSegment[]
): string {
  const schemaExample = {
    summary: "3-5 sentence video overview in English",
    takeaways: [
      {
        label: "Label (≤10 words)",
        label_zh: "中文标签",
        insight: "1-2 sentence insight",
        insight_zh: "中文解释",
        timestamps: ["0:12", "14:30"],
      },
    ],
    moments: [
      {
        title: "Title (≤10 words)",
        title_zh: "中文标题",
        timestamp: "00:18-00:25",
        quote: "exact transcript quote",
        quote_zh: "中文翻译",
        reason: "why this matters",
        reason_zh: "中文理由",
      },
    ],
    highlights: [
      {
        startTime: 12.0,
        endTime: 18.0,
        title: "Highlight title",
        quote: "exact transcript quote",
        reason: "why this segment matters",
      },
    ],
    suggestedQuestions: ["question1", "question2"],
  };

  return [
    "You are a comprehensive video analysis assistant. Given a video title and transcript, generate ALL of the following in a SINGLE response:",
    "",
    "1. summary: A 3-5 sentence English overview of the video",
    "2. takeaways: 4-6 bilingual key takeaways (English label/insight + Chinese label_zh/insight_zh)",
    "3. moments: 3-5 bilingual key moments with timestamps (English title/quote/reason + Chinese title_zh/quote_zh/reason_zh)",
    "4. highlights: 3-5 timestamped highlights with title, quote, and reason (English only)",
    "5. suggestedQuestions: 3-5 follow-up questions (English only)",
    "",
    "CRITICAL RULES:",
    "- All content MUST come directly from the transcript — never fabricate information, data, or names",
    "- All bilingual fields (label_zh, insight_zh, title_zh, quote_zh, reason_zh) must be faithful Chinese translations",
    "- timestamps in takeaways use M:SS format (e.g. 0:12, 14:30)",
    "- timestamp in moments uses MM:SS-MM:SS or HH:MM:SS-HH:MM:SS format",
    "- startTime/endTime in highlights use decimal seconds",
    "- Prioritize: counter-intuitive views, core arguments with data, story turns, methodology",
    "- Avoid: greetings, channel promos, context-free short sentences, repeated points",
    "- Cover beginning (first 20%), middle, and end (last 20%) of the video",
    "",
    "Return ONLY valid JSON (no markdown, no code blocks, no explanation). Schema:",
    JSON.stringify(schemaExample, null, 2),
    "",
    "Video: " + xmlEscape(title),
    "",
    "<transcript>",
    "<![CDATA[" + transcriptForSummaryPrompt(segments) + "]]>",
    "</transcript>",
  ].join("\n");
}

/**
 * Long transcripts are first distilled in parallel.  The reduction request below
 * receives these compact, timestamp-preserving notes instead of the entire video.
 */
export function buildComprehensiveChunkPrompt(
  title: string,
  segments: TranscriptSegment[],
): string {
  return [
    "You are extracting faithful, timestamped source notes for a later video-analysis pass.",
    "Return ONLY valid JSON: {\"notes\":[{\"timestamp\":\"M:SS\",\"fact\":\"...\",\"quote\":\"exact short quote\"}]}",
    "Extract 3-6 distinct, high-value facts, arguments, examples, or turning points.",
    "Use only the supplied transcript. Preserve exact timestamps and do not add conclusions.",
    "Video: " + xmlEscape(title),
    "<transcript>",
    "<![CDATA[" + transcriptForSummaryPrompt(segments, 16_000) + "]]>",
    "</transcript>",
  ].join("\n");
}

export function buildComprehensiveReducePrompt(
  title: string,
  chunkNotes: string[],
): string {
  const candidates = chunkNotes.join("\n\n");
  return [
    "You are a comprehensive video analysis assistant. Build the final analysis from the timestamped source notes below.",
    "Return ALL fields in the exact JSON schema. Never invent facts, quotes, or timestamps; omit a field item if evidence is insufficient.",
    "summary: 3-5 sentence English overview.",
    "takeaways: 4-6 bilingual takeaways; moments: 3-5 bilingual key moments; highlights: 3-5 exact, timestamped highlights; suggestedQuestions: 3-5 English questions.",
    "Schema:",
    JSON.stringify({
      summary: "3-5 sentence video overview in English",
      takeaways: [{ label: "Label", label_zh: "中文标签", insight: "Insight", insight_zh: "中文解释", timestamps: ["0:12"] }],
      moments: [{ title: "Title", title_zh: "中文标题", timestamp: "00:12-00:20", quote: "exact quote", quote_zh: "中文翻译", reason: "why it matters", reason_zh: "中文理由" }],
      highlights: [{ startTime: 12, endTime: 20, title: "Title", quote: "exact quote", reason: "why it matters" }],
      suggestedQuestions: ["Question"],
    }),
    "Video: " + xmlEscape(title),
    "<source_notes>",
    "<![CDATA[" + candidates + "]]>",
    "</source_notes>",
  ].join("\n");
}
