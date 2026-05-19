import type { KeyMoment, TranscriptSegment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";

// ====== 字幕格式化 ======

/**
 * 为 prompt 格式化字幕，使用 CDATA 包裹
 * maxChars: 最大字符数，默认 30K
 */
function transcriptForXmlPrompt(
  segments: TranscriptSegment[],
  maxChars = 30_000
): string {
  let totalChars = 0;
  const selected: TranscriptSegment[] = [];

  for (const segment of selectSegments(segments)) {
    const lineLength = segment.text.length + 24;
    if (totalChars + lineLength > maxChars) break;
    selected.push(segment);
    totalChars += lineLength;
  }

  return selected
    .map((s) => `[${formatTimestamp(s.startTime)}-${formatTimestamp(s.endTime)}] ${s.text}`)
    .join("\n");
}

/** 段选择：头-中-尾 策略（≤250 段全选，超过则采样） */
function selectSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (segments.length <= 250) return segments;
  const head = segments.slice(0, 130);
  const midStart = Math.max(130, Math.floor(segments.length / 2) - 50);
  const middle = segments.slice(midStart, midStart + 90);
  const tail = segments.slice(-60);
  return [...head, ...middle, ...tail];
}

// ====== XML 工具 ======

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ====== Key Moments Prompts ======

/**
 * Smart 模式：全文单次分析
 */
export function buildKeyMomentsPrompt(
  title: string,
  segments: TranscriptSegment[],
  lang: "zh" | "en" = "zh",
  theme?: string
): string {
  const isZh = lang === "zh";

  const schemaExample = isZh
    ? { moments: [{ title: "标题(≤20字)", timestamp: "00:18-00:25", quote: "字幕原文引用", reason: "为什么值得关注" }] }
    : { moments: [{ title: "Title (≤10 words)", timestamp: "00:18-00:25", quote: "exact transcript quote", reason: "why this matters" }] };

  const instructions = isZh
    ? [
        "从字幕中找出 1-5 个最值得关注的片段。",
        "每条含 title(≤20字)、timestamp(MM:SS-MM:SS 或 HH:MM:SS-HH:MM:SS)、quote(字幕原文禁止改写)、reason(一句话)。",
        "优先: 反常识观点、核心论点+数据、故事转折、方法论。",
        "避免: 开场寒暄、订阅推广、无上下文短句、重复观点。",
        "尽量覆盖视频开头(前20%)、中段、结尾(后20%)。",
        "每条片段建议 45-75 秒。宁缺毋滥。最多 5 条。"
      ]
    : [
        "Identify 1-5 key moments from the transcript.",
        "Each has: title (≤10 words), timestamp (MM:SS-MM:SS or HH:MM:SS-HH:MM:SS), quote (exact transcript text, do not rewrite), reason (1 sentence).",
        "Prioritize: counter-intuitive views, core arguments with data, story turns, methodology.",
        "Avoid: greetings, channel promos, context-free short sentences, repeated points.",
        "Cover beginning (first 20%), middle, and end (last 20%) of the video.",
        "Quality over quantity. Max 5."
      ];

  const themeLine = theme
    ? (isZh ? "聚焦主题: " + xmlEscape(theme) + "。只选相关片段。" : "Focus on: " + xmlEscape(theme) + ". Only select relevant segments.")
    : "";

  return [
    isZh
      ? "你是一位视频内容分析师。从字幕中提取最有学习价值的要点时刻。"
      : "You are a video content analyst. Extract the most valuable key moments from the transcript.",
    "",
    instructions.join("\n"),
    themeLine,
    "",
    "输出纯 JSON (不要 markdown):",
    JSON.stringify(schemaExample),
    "",
    "视频: " + xmlEscape(title),
    "",
    "<transcript>",
    "<![CDATA[" + transcriptForXmlPrompt(segments) + "]]>",
    "</transcript>"
  ].filter(Boolean).join("\n");
}

/**
 * Fast 模式：单 chunk 分析
 */
export function buildKeyMomentsChunkPrompt(
  title: string,
  segments: TranscriptSegment[],
  lang: "zh" | "en" = "zh",
  theme?: string
): string {
  return buildKeyMomentsPrompt(title, segments, lang, theme)
    .replace("1-5 个", "1-2 个")
    .replace("最多 5 条", "最多 2 条")
    .replace("1-5 key moments", "1-2 key moments")
    .replace("Max 5", "Max 2");
}

/**
 * Fast 模式：归并候选
 */
export function buildKeyMomentsReducePrompt(
  title: string,
  candidates: KeyMoment[],
  _fullTranscript: TranscriptSegment[],
  lang: "zh" | "en" = "zh"
): string {
  const isZh = lang === "zh";

  const candidatesStr = JSON.stringify(
    candidates.map((c, i) => ({ id: i, ...c })),
    null,
    2
  );

  return [
    isZh
      ? "你是最终评审员。从候选要点时刻中选出最优质的 1-5 个。"
      : "You are the final reviewer. Select the best 1-5 key moments from candidates.",
    "",
    isZh
      ? "规则: 最多 5 个。优先主题多样。覆盖开头/中段/结尾。可微调 title/reason，禁止改 quote/timestamp。宁缺毋滥。"
      : "Rules: Max 5. Prioritize diversity. Cover beginning/middle/end. May refine title/reason, DO NOT change quote/timestamp. Quality over quantity.",
    "",
    "输出纯 JSON: {\"moments\": [...]}",
    "",
    "视频: " + xmlEscape(title),
    "",
    "<candidates>",
    "<![CDATA[" + candidatesStr + "]]>",
    "</candidates>"
  ].join("\n");
}

// ====== Structured Summary Prompt ======

export function buildStructuredSummaryPrompt(
  title: string,
  segments: TranscriptSegment[],
  lang: "zh" | "en" = "zh"
): string {
  const isZh = lang === "zh";

  const schemaExample = isZh
    ? { takeaways: [{ label: "标签(≤20字)", insight: "1-2句话解释核心观点", timestamps: ["0:12", "0:18"] }] }
    : { takeaways: [{ label: "Label (≤10 words)", insight: "1-2 sentence insight", timestamps: ["0:12", "0:18"] }] };

  const instructions = isZh
    ? [
        "从字幕中提取 4-6 条核心摘要。",
        "每条含 label(≤20字)、insight(1-2句话)、timestamps(1-2个M:SS格式的真实时间戳)。",
        "只使用字幕中明确出现的信息，禁止编造。",
        "优先选择: 反常识观点、具体案例、关键数据、方法论。",
        "时间戳格式必须是 M:SS 或 MM:SS (如 0:12, 14:30)，不能是纯数字。"
      ]
    : [
        "Extract 4-6 key takeaways from the transcript.",
        "Each has: label (≤10 words), insight (1-2 sentences), timestamps (1-2 real timestamps in M:SS format).",
        "Only use information explicitly stated in the transcript. Do not fabricate.",
        "Prioritize: counter-intuitive views, concrete cases, key data, methodology.",
        "Timestamp format must be M:SS or MM:SS (e.g., 0:12, 14:30), NOT raw numbers."
      ];

  return [
    isZh
      ? "你是一位学习笔记整理师。从视频字幕中提取结构化核心摘要。"
      : "You are a study notes organizer. Extract structured key takeaways from the transcript.",
    "",
    instructions.join("\n"),
    "",
    "输出纯 JSON (不要 markdown):",
    JSON.stringify(schemaExample),
    "",
    "视频: " + xmlEscape(title),
    "",
    "<transcript>",
    "<![CDATA[" + transcriptForXmlPrompt(segments) + "]]>",
    "</transcript>"
  ].join("\n");
}
