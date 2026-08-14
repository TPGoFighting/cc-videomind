import type { TranscriptSegment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";
import type { RetrievedChunk } from "@/lib/embedding/retriever";

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
    summary: "本视频深入探讨了[主题]，通过[具体案例/数据]展示了[核心发现]。同时讨论了[挑战/反面观点]，并展望了[未来方向/结论]。",
    takeaways: [
      "要点需包含具体数据、人名、机构或因果逻辑。例如：2018年斯坦福研究表明，AI识别皮肤癌准确率达95%，远高于人类专家的86%",
      "覆盖不同维度：核心突破、应用案例、挑战风险、未来趋势等，避免重复同一观点",
      "避免空洞概括如「XX很重要」，而要写出「为什么重要」「怎么做到的」「有什么影响」"
    ],
    suggestedQuestions: [
      "基于视频具体内容提出的深入问题，引导学习者回顾关键信息",
      "问题应能引出视频中的具体论据或案例",
      "例如：AlphaFold是如何解决蛋白质折叠问题的？它对药物研发有什么影响？"
    ],
    highlights: [
      { startTime: 12.0, endTime: 18.0, title: "亮点标题（简短有力）", quote: "字幕原文引用", reason: "说明为什么这个片段值得关注" },
      { startTime: 40.5, endTime: 47.0, title: "第二个亮点", quote: "对应的原文引用", reason: "这段内容的重要性或独特性" },
      { startTime: 80.0, endTime: 88.0, title: "第三个亮点", quote: "对应的原文引用", reason: "为什么选择这段内容" }
    ]
  };

  return [
    "你是一个专业的学习笔记整理助手。基于视频字幕生成高质量的学习笔记。",
    "",
    "⚠️ 核心原则：",
    "- 所有内容必须严格来自字幕，禁止编造任何信息、数据或人名",
    "- 摘要要有信息量，覆盖主要话题和关键结论，不能只是泛泛而谈",
    "- 每条要点必须包含具体细节（数据、案例、机构名、因果逻辑），避免空洞概括",
    "- 亮点要选择真正有信息价值、值得学习者重点关注的片段",
    "",
    "返回纯 JSON（不要加 markdown、代码块标记或额外说明文字）：",
    JSON.stringify(schemaExample, null, 2),
    "",
    "字段要求：",
    "- summary：2-3 句有信息量的概括（100-200字），包含具体话题和结论",
    "- takeaways：5-8 条，每条要有具体细节，覆盖不同维度",
    "- suggestedQuestions：4-8 条，引导学习者深入思考视频内容",
    "- highlights：5-8 个，每个必须是字幕中真实存在的片段",
    "- 所有时间戳使用数字秒",
    "",
    `【视频标题】${title}`,
    "",
    "【字幕内容】",
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
    answer: "基于字幕内容的详细回答，包含具体数据和论据，避免泛泛而谈",
    citations: [
      { startTime: 12.0, endTime: 18.0, quote: "字幕中支持该回答的原文引用" },
      { startTime: 45.5, endTime: 52.0, quote: "另一段相关的原文引用" }
    ]
  };

  return [
    "你是一个基于视频字幕的问答助手。严格基于字幕内容回答问题，禁止编造任何信息；若现有字幕不足以回答，明确写“无法从视频字幕中证实”，并返回空 citations。",
    "",
    "返回纯 JSON（不要加 markdown、代码块标记或额外说明文字）：",
    JSON.stringify(schemaExample, null, 2),
    "",
    "字段要求：",
    "- answer：详细的回答，包含字幕中的具体信息和论据",
    "- citations：1-5 条引用，每条含 startTime(秒)、endTime(秒)、quote(字幕原文，需能在字幕中找到)",
    "",
    `【问题】${question}`,
    "",
    "【字幕内容】",
    transcriptForPrompt(segments)
  ].join("\n");
}

export function buildRagChatPrompt(question: string, chunks: RetrievedChunk[]) {
  const schemaExample = {
    answer: "基于字幕内容的详细回答，包含具体数据和论据，避免泛泛而谈",
    citations: [
      { startTime: 12.0, endTime: 18.0, quote: "字幕中支持该回答的原文引用" },
      { startTime: 45.5, endTime: 52.0, quote: "另一段相关的原文引用" }
    ]
  };

  const contextBlocks = chunks
    .map((c) => {
      const segLabel = `Segment ${c.segmentStart}-${c.segmentEnd}`;
      return `[${segLabel}] ${c.text}`;
    })
    .join("\n\n");

  return [
    "你是一个基于视频字幕的问答助手。严格基于字幕内容回答问题，禁止编造任何信息。",
    "",
    "返回纯 JSON（不要加 markdown、代码块标记或额外说明文字）：",
    JSON.stringify(schemaExample, null, 2),
    "",
    "字段要求：",
    "- answer：详细的回答，包含字幕中的具体信息和论据",
    "- citations：1-5 条引用，每条含 startTime(秒)、endTime(秒)、quote(字幕原文，需能在字幕中找到)",
    "- 引用的 startTime/endTime 应从提供的 Segment 标签中取，直接使用 segment 范围即可",
    "",
    `【问题】${question}`,
    "",
    "【检索到的相关字幕片段】",
    contextBlocks
  ].join("\n");
}
