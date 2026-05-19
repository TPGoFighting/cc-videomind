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
  const schemaExample = {
    summary: "一句话概述视频内容",
    takeaways: ["关键点 1", "关键点 2", "关键点 3"],
    suggestedQuestions: ["问题 1", "问题 2", "问题 3"],
    highlights: [
      {
        startTime: 10.5,
        endTime: 35.2,
        title: "亮点标题",
        quote: "原文引用",
        reason: "为什么重要"
      }
    ]
  };

  return [
    "你是 VideoMind，一个严谨的学习助手。",
    "严格基于字幕内容，禁止编造任何引用、观点或时间戳。",
    "",
    "你必须返回如下 JSON 结构（不要添加任何解释、markdown 标记或额外文本）：",
    JSON.stringify(schemaExample, null, 2),
    "",
    "要求：",
    "- summary：1-3 句话概括视频内容",
    "- takeaways：3-8 个关键要点",
    "- suggestedQuestions：3-8 个基于内容的问题",
    "- highlights：5-8 个亮点，每个含 startTime(秒)、endTime(秒)、title、quote(原文引用)、reason(重要性)",
    "- 所有时间戳使用数字秒",
    "",
    `视频标题：${title}`,
    "字幕内容：",
    transcriptForPrompt(segments)
  ].join("\n");
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
  const schemaExample = {
    answer: "基于字幕的回答内容",
    citations: [
      {
        startTime: 10.5,
        endTime: 35.2,
        quote: "相关字幕原文引用"
      }
    ]
  };

  return [
    "你是 VideoMind，一个严谨的学习助手。",
    "严格基于字幕内容回答问题，禁止编造任何信息。",
    "",
    "你必须返回如下 JSON 结构（不要添加任何解释、markdown 标记或额外文本）：",
    JSON.stringify(schemaExample, null, 2),
    "",
    "要求：",
    "- answer：基于字幕的详细回答",
    "- citations：1-5 条引用，每条含 startTime(秒)、endTime(秒)、quote(字幕原文)",
    "- 时间戳必须能在字幕中找到对应位置",
    "",
    `问题：${question}`,
    "字幕内容：",
    transcriptForPrompt(segments)
  ].join("\n");
}
