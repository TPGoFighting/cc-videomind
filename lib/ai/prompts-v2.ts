import type { KeyMoment, TranscriptSegment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";

// ====== 字幕格式化 ======

/**
 * 为 XML prompt 格式化字幕，使用 CDATA 包裹
 * maxChars: 最大字符数，默认 80K
 */
function transcriptForXmlPrompt(
  segments: TranscriptSegment[],
  maxChars = 80_000
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

  const schemaExample = {
    moments: [
      {
        title: isZh ? "反常识观点：AI替代医生还是赋能医生？" : "Counter-intuitive: AI replacing or empowering doctors?",
        timestamp: "00:18-00:25",
        quote: isZh ? "这不是说AI要取代医生，而是成为医生的第二双眼睛" : "exact transcript quote here",
        reason: isZh ? "纠正了常见的AI取代焦虑，重新定义了人机协作的关系" : "why this segment matters"
      },
      {
        title: isZh ? "关键方法论：联邦学习如何保护隐私" : "Methodology: How federated learning protects privacy",
        timestamp: "01:32-01:40",
        quote: "exact quote from transcript",
        reason: isZh ? "展示了一项关键技术的实际工作原理" : "shows how a key technology actually works"
      }
    ]
  };

  const themeSection = theme
    ? `\n<theme>聚焦主题：${xmlEscape(theme)}。只选择与该主题高度相关的片段，不相关内容不要选。</theme>`
    : "";

  return [
    "<task>",
    isZh
      ? "  <role>你是一位专业的视频内容分析师。你的任务是从视频字幕中提取最具学习价值的要点时刻。</role>"
      : "  <role>You are a professional video content analyst. Extract the most valuable key moments from video transcripts.</role>",
    isZh
      ? "  <goal>从字幕中找出 1-5 个最值得关注的片段，帮助学习者快速定位视频的核心内容。</goal>"
      : "  <goal>Identify 1-5 key moments from the transcript to help learners quickly locate core content.</goal>",
    "  <selectionCriteria>",
    isZh
      ? "    <criterion priority=\"high\">反常识观点或令人意外的结论</criterion>"
      : "    <criterion priority=\"high\">Counter-intuitive views or surprising conclusions</criterion>",
    isZh
      ? "    <criterion priority=\"high\">核心论点，包含具体数据或案例支撑</criterion>"
      : "    <criterion priority=\"high\">Core arguments supported by concrete data or cases</criterion>",
    isZh
      ? "    <criterion priority=\"high\">故事转折点或方法论揭示</criterion>"
      : "    <criterion priority=\"high\">Story turning points or methodology reveals</criterion>",
    isZh
      ? "    <criterion priority=\"medium\">情绪强烈或表达精彩的片段</criterion>"
      : "    <criterion priority=\"medium\">Emotionally impactful or well-expressed segments</criterion>",
    isZh
      ? "    <criterion priority=\"medium\">具体操作步骤或实用技巧</criterion>"
      : "    <criterion priority=\"medium\">Concrete steps or practical tips</criterion>",
    "  </selectionCriteria>",
    "  <avoidanceCriteria>",
    isZh
      ? "    <criterion>开场寒暄、自我介绍</criterion>"
      : "    <criterion>Opening greetings, self-introductions</criterion>",
    isZh
      ? "    <criterion>订阅提醒、频道推广</criterion>"
      : "    <criterion>Subscribe reminders, channel promotion</criterion>",
    isZh
      ? "    <criterion>无上下文的孤立短句</criterion>"
      : "    <criterion>Isolated short sentences without context</criterion>",
    isZh
      ? "    <criterion>重复表达相同观点</criterion>"
      : "    <criterion>Repeated expressions of the same point</criterion>",
    isZh
      ? "    <criterion>纯过渡句（如“接下来我们看...”）</criterion>"
      : "    <criterion>Pure transition sentences</criterion>",
    "  </avoidanceCriteria>",
    "  <coverageRule>尽量覆盖视频的开头（前20%）、中段（20%-80%）和结尾（后20%），避免所有片段都集中在同一时间段。</coverageRule>",
    isZh
      ? "    <durationGuidance>每个片段建议 45-75 秒。视频较短时可适当缩短。</durationGuidance>"
      : "    <durationGuidance>Each segment should be 45-75 seconds ideally. Shorter segments are acceptable for short videos.</durationGuidance>",
    isZh
      ? "    <qualityOverQuantity>宁缺毋滥。如果高质量片段不足 5 个，返回少于 5 个，不要凑数。</qualityOverQuantity>"
      : "    <qualityOverQuantity>Quality over quantity. Return fewer than 5 if there aren't enough high-quality moments.</qualityOverQuantity>",
    "    <maxMoments>5</maxMoments>",
    "  <outputFormat>",
    isZh
      ? "    返回纯 JSON 对象（不要 markdown 或额外文字）。格式如下："
      : "    Return a pure JSON object (no markdown or extra text). Format:",
    JSON.stringify(schemaExample, null, 2),
    "  </outputFormat>",
    "  <fieldRequirements>",
    isZh
      ? "    <field name=\"title\">简洁有信息量，最多 10 个词或 20 个中文字符</field>"
      : "    <field name=\"title\">Concise and informative, max 10 words</field>",
    isZh
      ? "    <field name=\"timestamp\">必须是 [MM:SS-MM:SS] 格式的时间段，来自字幕中的真实时间戳</field>"
      : "    <field name=\"timestamp\">Must be [MM:SS-MM:SS] range format, using real timestamps from the transcript</field>",
    isZh
      ? "    <field name=\"quote\">必须是字幕原文，不能改写、不能拼接不连续片段、不能编造</field>"
      : "    <field name=\"quote\">Must be exact transcript text, no rewriting, splicing, or fabrication</field>",
    isZh
      ? "    <field name=\"reason\">1 句话解释为什么这个片段值得学习者关注</field>"
      : "    <field name=\"reason\">1 sentence explaining why this segment deserves attention</field>",
    "  </fieldRequirements>",
    `  <videoTitle>${xmlEscape(title)}</videoTitle>`,
    themeSection,
    "</task>",
    "",
    "<transcript>",
    `<![CDATA[${transcriptForXmlPrompt(segments)}]]>`,
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
    .replace("<maxMoments>5</maxMoments>", "<maxMoments>2</maxMoments>")
    .replace(
      lang === "zh"
        ? "从字幕中找出 1-5 个最值得关注的片段"
        : "Identify 1-5 key moments",
      lang === "zh"
        ? "从这段字幕片段中找出最多 2 个候选要点时刻"
        : "Identify up to 2 candidate key moments from this transcript segment"
    );
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
    "<task>",
    isZh
      ? "  <role>你是最终评审员。从多个候选要点时刻中选出最优质的 1-5 个。</role>"
      : "  <role>You are the final reviewer. Select the best 1-5 key moments from candidates.</role>",
    isZh
      ? "  <goal>从以下候选列表中选出最值得关注的片段，作为最终输出。</goal>"
      : "  <goal>Select the most noteworthy segments from the candidates below.</goal>",
    "  <rules>",
    isZh
      ? "    <rule>最多 5 个最终结果</rule>"
      : "    <rule>Maximum 5 final results</rule>",
    isZh
      ? "    <rule>优先选择主题不同的片段，避免重复</rule>"
      : "    <rule>Prioritize thematic diversity, avoid repetition</rule>",
    isZh
      ? "    <rule>覆盖视频的开头、中段和结尾</rule>"
      : "    <rule>Cover beginning, middle, and end of video</rule>",
    isZh
      ? "    <rule>可以微调 title 和 reason 使其更精准，但禁止修改 quote 和 timestamp</rule>"
      : "    <rule>You may refine title and reason, but DO NOT modify quote or timestamp</rule>",
    isZh
      ? "    <rule>宁缺毋滥，质量不够就返回少于 5 个</rule>"
      : "    <rule>Quality over quantity, return fewer than 5 if needed</rule>",
    "  </rules>",
    "  <outputFormat>返回纯 JSON 对象：{\"moments\": [...]}</outputFormat>",
    `  <videoTitle>${xmlEscape(title)}</videoTitle>`,
    "</task>",
    "",
    "<candidates>",
    `<![CDATA[${candidatesStr}]]>`,
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

  const schemaExample = {
    takeaways: [
      {
        label: isZh ? "AI影像诊断超越人类专家" : "AI imaging diagnosis surpasses human experts",
        insight: isZh
          ? "2018年斯坦福研究表明，AI识别皮肤癌准确率达95%，显著高于人类专家的86%。这意味着AI可以作为医生的'第二双眼睛'，而非替代医生。"
          : "In 2018, a Stanford study showed AI skin cancer detection at 95% accuracy vs 86% for human experts.",
        timestamps: ["0:12", "0:18"]
      },
      {
        label: isZh ? "联邦学习解决医疗数据隐私" : "Federated learning solves medical data privacy",
        insight: isZh
          ? "医疗数据高度敏感，联邦学习允许多家医院在不共享原始数据的前提下共同训练AI模型，为隐私保护提供了技术路径。"
          : "Federated learning enables hospitals to co-train AI without sharing raw data.",
        timestamps: ["1:32"]
      }
    ]
  };

  return [
    "<task>",
    isZh
      ? "  <role>你是一位专业的学习笔记整理师。从视频字幕中提取结构化核心摘要。</role>"
      : "  <role>You are a professional study notes organizer. Extract structured key takeaways from video transcripts.</role>",
    isZh
      ? "  <goal>生成 4-6 条核心摘要，每条包含标签、洞察和支持时间戳。</goal>"
      : "  <goal>Generate 4-6 key takeaways, each with a label, insight, and supporting timestamps.</goal>",
    "  <requirements>",
    isZh
      ? "    <requirement>返回 4-6 条 takeaway，优先选择最有价值的观点</requirement>"
      : "    <requirement>Return 4-6 takeaways, prioritizing the most valuable insights</requirement>",
    isZh
      ? "    <requirement>label 要具体、有记忆点，最多 10 个词或 20 个中文字符</requirement>"
      : "    <requirement>Label must be specific and memorable, max 10 words</requirement>",
    isZh
      ? "    <requirement>insight 用 1-2 句话解释核心观点，包含具体细节</requirement>"
      : "    <requirement>Insight should be 1-2 sentences with specific details</requirement>",
    isZh
      ? "    <requirement>每条 takeaway 必须包含 1-2 个支撑时间戳（来自字幕中的真实时间）</requirement>"
      : "    <requirement>Each takeaway must have 1-2 supporting timestamps from the transcript</requirement>",
    isZh
      ? "    <requirement>只使用字幕中明确出现的信息，禁止推测或编造</requirement>"
      : "    <requirement>Only use information explicitly in the transcript</requirement>",
    isZh
      ? "    <requirement>每条 takeaway 相互独立，避免观点重复</requirement>"
      : "    <requirement>Each takeaway must be independent, avoid overlap</requirement>",
    isZh
      ? "    <requirement>优先选择：反常识观点、具体案例、关键数据、故事转折、方法论</requirement>"
      : "    <requirement>Prioritize: counter-intuitive views, concrete cases, key data, story turns, methodology</requirement>",
    isZh
      ? "    <requirement>如果内容不足，也要从字幕中选出最强的 4 条，不要编造</requirement>"
      : "    <requirement>If content is sparse, still select the strongest 4 from the transcript</requirement>",
    "  </requirements>",
    "  <outputFormat>返回纯 JSON 对象（不要 markdown 或额外文字）：",
    JSON.stringify(schemaExample, null, 2),
    "  </outputFormat>",
    `  <videoTitle>${xmlEscape(title)}</videoTitle>`,
    "</task>",
    "",
    "<transcript>",
    `<![CDATA[${transcriptForXmlPrompt(segments)}]]>`,
    "</transcript>"
  ].join("\n");
}
