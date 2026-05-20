import type { TranscriptSegment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 批量生成词义定义的 prompt。
 * 输入词形列表，输出结构化 JSON。
 */
export function buildWordDefinitionsPrompt(lemmas: string[]): string {
  const wordList = lemmas.slice(0, 30).join(", ");

  return [
    "你是一位专业英语词典编纂师。请为下列英语单词生成中文释义和例句。",
    "",
    "对每个单词，输出以下字段：",
    "- lemma: 词形（保持输入形式）",
    "- phonetic: 音标（IPA 格式，可选）",
    "- partOfSpeech: 词性（如 n./v./adj./adv./prep./conj. 等）",
    "- definitionZh: 中文释义（1-2 个最常用义项）",
    "- definitionEn: 英文释义（可选，1 句简洁描述）",
    "- exampleEn: 英文例句（1 句自然的口语/书面例句）",
    "- exampleZh: 中文翻译例句（对应英文例句的翻译）",
    "",
    "要求：",
    "- 例句必须真实自然，来自日常英语或学术语境",
    "- 释义优先选择最常见的义项",
    "- 音标使用标准 IPA",
    "",
    "输出纯 JSON（不要 markdown）：",
    JSON.stringify({
      definitions: [
        {
          lemma: "example",
          phonetic: "/ɪɡˈzæmpəl/",
          partOfSpeech: "n.",
          definitionZh: "例子；范例",
          definitionEn: "a thing that serves as a pattern",
          exampleEn: "This is a good example of modern architecture.",
          exampleZh: "这是现代建筑的一个好例子。"
        }
      ]
    }),
    "",
    "单词列表: " + wordList
  ].join("\n");
}

/**
 * 翻译转录文本为中文的 prompt（索引格式，解析更可靠）。
 * 参考 Longcut：使用 [INPUT_N]/[OUTPUT_N] 显式标记，
 * 避免 JSON 解析失败导致整批丢失。
 */
export function buildTranscriptTranslationPrompt(
  segments: TranscriptSegment[],
  targetLanguage: string = "zh-CN",
  videoTitle?: string
): string {
  const textsList = segments
    .map((_s, i) => `[INPUT_${i}]\n${_s.text}\n[/INPUT_${i}]`)
    .join("\n\n");

  const baseInstructions = `你是一位专业的字幕翻译专家。请将以下视频字幕翻译为${targetLanguage === "zh-CN" ? "简体中文" : targetLanguage}。

核心原则：
- 翻译意思和意图，而非逐字直译
- 使用自然、流畅、地道的目标语言
- 删除填充词（um, uh, like, you know 等）和口误
- 对明显的语音识别错误，根据上下文修正
- 保留代码片段、URL、专有名词
- 保持口语化的自然节奏`;

  const contextLine = videoTitle
    ? `\n视频标题：${videoTitle}\n根据标题理解视频主题，确保翻译术语准确。`
    : "";

  return `${baseInstructions}${contextLine}

翻译下面 ${segments.length} 条字幕。

${textsList}

输出格式要求：
1. 每条翻译用 [OUTPUT_N]...[/OUTPUT_N] 包裹
2. N 必须对应输入索引（0 到 ${segments.length - 1}）
3. 按数字顺序输出所有 ${segments.length} 条翻译
4. 不要加任何解释、标签或额外内容
5. 空输入对应空输出

示例输出格式：
[OUTPUT_0]
第一条翻译文本
[/OUTPUT_0]
[OUTPUT_1]
第二条翻译文本
[/OUTPUT_1]

现在输出全部 ${segments.length} 条翻译：`;
}

/**
 * 解析索引格式的翻译响应。
 * 格式：[OUTPUT_N]...[/OUTPUT_N]
 * 返回 Map<索引, 翻译文本>，解析失败返回空 Map。
 */
export function parseIndexedTranslation(response: string, expectedCount: number): Map<number, string> {
  const map = new Map<number, string>();
  const pattern = /\[OUTPUT_(\d+)\]([\s\S]*?)\[\/OUTPUT_\1\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(response)) !== null) {
    const index = parseInt(match[1], 10);
    const content = match[2].trim();
    if (index >= 0 && index < expectedCount && content.length > 0) {
      map.set(index, content);
    }
  }

  return map;
}

/**
 * 双语 KeyMoment prompt（扩展原 prompt，增加 _zh 翻译字段输出）。
 */
export function buildBilingualMomentsPrompt(
  title: string,
  segments: TranscriptSegment[],
  theme?: string
): string {
  const schemaExample = {
    moments: [{
      title: "市场时机的重要性",
      title_zh: "市场时机的重要性",
      timestamp: "00:18-00:25",
      quote: "If you miss the best 10 days in the market, your returns drop by half.",
      quote_zh: "如果你错过了市场上最好的10天，你的收益会下降一半。",
      reason: "反直觉：即使正确判断大趋势，错过关键几天也会导致收益大幅减少",
      reason_zh: "反直觉：即使正确判断大趋势，错过关键几天也会导致收益大幅减少"
    }]
  };

  const themeLine = theme
    ? "聚焦主题: " + xmlEscape(theme) + "。只选相关片段。"
    : "";

  return [
    "你是一位视频内容分析师。从字幕中提取最有学习价值的要点时刻。",
    "同时提供中英双语输出：title/quote/reason 为英文原文，对应的 _zh 字段为中文翻译。",
    "",
    "规则:",
    "- 从字幕中找出 1-5 个最值得关注的片段",
    "- title ≤ 120 字符, timestamp 格式 MM:SS-MM:SS, quote=字幕原文禁止改写, reason=一句话",
    "- _zh 字段是中文翻译，保持与原文一致的语义",
    "- 优先: 反常识观点、核心论点+数据、故事转折、方法论",
    "- 避免: 开场寒暄、订阅推广、无上下文短句、重复观点",
    "- 尽量覆盖视频开头、中段、结尾。每条片段 45-75 秒。宁缺毋滥。",
    "",
    themeLine,
    "",
    "输出纯 JSON:",
    JSON.stringify(schemaExample),
    "",
    "视频: " + xmlEscape(title),
    "",
    "<transcript>",
    "<![CDATA[" + formatTranscriptForPrompt(segments) + "]]>",
    "</transcript>"
  ].filter(Boolean).join("\n");
}

/**
 * 双语 Summary prompt（扩展原 prompt，增加 _zh 翻译字段输出）。
 */
export function buildBilingualSummaryPrompt(
  title: string,
  segments: TranscriptSegment[]
): string {
  const schemaExample = {
    takeaways: [{
      label: "复利效应的核心价值",
      label_zh: "复利效应的核心价值",
      insight: "Small consistent gains compound into massive differences over long time horizons.",
      insight_zh: "长期来看，微小而持续的收益会复利积累成巨大的差异。",
      timestamps: ["0:12", "0:18"]
    }]
  };

  return [
    "你是一位学习笔记整理师。从视频字幕中提取结构化核心摘要。",
    "同时提供中英双语输出：label/insight 为英文原文，_zh 字段为中文翻译。",
    "",
    "规则:",
    "- 提取 4-6 条核心摘要",
    "- label ≤ 120 字符，insight = 1-2句话",
    "- _zh 字段是中文翻译，保持与原文一致的语义",
    "- timestamps = 1-2 个真实时间戳（M:SS 或 MM:SS 格式）",
    "- 只使用字幕中明确出现的信息，禁止编造",
    "- 优先: 反常识观点、具体案例、关键数据、方法论",
    "",
    "输出纯 JSON:",
    JSON.stringify(schemaExample),
    "",
    "视频: " + xmlEscape(title),
    "",
    "<transcript>",
    "<![CDATA[" + formatTranscriptForPrompt(segments) + "]]>",
    "</transcript>"
  ].join("\n");
}

/** 格式化字幕文本用于 prompt（复用已有逻辑） */
function formatTranscriptForPrompt(
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

function selectSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (segments.length <= 250) return segments;
  const head = segments.slice(0, 130);
  const midStart = Math.max(130, Math.floor(segments.length / 2) - 50);
  const middle = segments.slice(midStart, midStart + 90);
  const tail = segments.slice(-60);
  return [...head, ...middle, ...tail];
}
