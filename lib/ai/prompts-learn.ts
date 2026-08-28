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

/** 生成单句语法解析 prompt，返回可校验的结构化 JSON。 */
export function buildGrammarAnalysisPrompt(sentence: string): string {
  return [
    "你是一位面向中文学习者的专业英语教师。请只分析给定句子，不要补充句子外的信息。",
    "",
    "输出字段：",
    "- sentence: 原句，保持原文",
    "- translation: 自然、准确的简体中文翻译",
    "- posTags: 按原句顺序列出每个英文词或短语，字段为 word 和 pos（使用 noun/verb/adjective/adverb/preposition/conjunction/pronoun/determiner/phrase 等简短英文标签）",
    "- structure: 用简短中文说明句子结构，例如 SVO、主句+从句",
    "- explanation: 用中文解释时态、从句、固定搭配和容易误解的地方，控制在 3-5 句",
    "",
    "规则：",
    "- 只使用原句中的词，不编造上下文",
    "- word 必须保留英文拼写，标点可以省略",
    "- posTags 至少包含句子中的主要词语",
    "- 输出纯 JSON，不要 markdown，不要额外解释",
    "",
    "句子：",
    "<sentence><![CDATA[" + sentence.replace(/]]>/g, "] ] >") + "]]></sentence>",
  ].join("\n");
}

/**
 * 翻译转录文本的 prompt。
 * 使用简短的编号行 + JSON 数组，兼容更多 OpenAI-compatible 网关；
 * 解析器仍保留旧的 [OUTPUT_N] 标签格式作为回退。
 */
export function buildTranscriptTranslationPrompt(
  segments: TranscriptSegment[],
  targetLanguage: string = "zh-CN",
  videoTitle?: string
): string {
  const textsList = segments
    .map((_s, i) => `${i + 1}. ${_s.text.replace(/\s+/g, " ").trim()}`)
    .join("\n");

  const target = targetLanguage === "zh-CN" ? "Simplified Chinese" : targetLanguage;
  const baseInstructions = `Translate the following subtitle lines into ${target}.

Rules:
- Preserve the meaning and intent; use natural, fluent language.
- Remove filler words and obvious speech-recognition mistakes when context is clear.
- Keep code, URLs, and proper nouns intact.
- Return one translation for every input line, in the same order.`;

  const contextLine = videoTitle
    ? `\nVideo title: ${videoTitle}\nUse the title only to disambiguate terminology.`
    : "";

  return `${baseInstructions}${contextLine}

There are ${segments.length} subtitle lines:

${textsList}

Output only a valid JSON array of ${segments.length} strings. Do not use markdown fences or add explanations.
Example: ["translated line 1", "translated line 2"]
Now output all ${segments.length} translations:`;
}

/**
 * 解析翻译响应。
 * 首选 JSON 数组，同时兼容历史 [OUTPUT_N]...[/OUTPUT_N] 格式。
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

  if (map.size > 0) return map;

  const candidates = [response.trim()];
  const codeBlocks = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/gi) ?? [];
  candidates.push(...codeBlocks.map((block) =>
    block.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
  ));

  const arrayStart = response.indexOf("[");
  if (arrayStart >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = arrayStart; i < response.length; i++) {
      const char = response[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\" && inString) {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === "[") depth++;
      if (char === "]") {
        depth--;
        if (depth === 0) {
          candidates.push(response.slice(arrayStart, i + 1));
          break;
        }
      }
    }
  }

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate) as unknown;
      const translations = Array.isArray(value)
        ? value
        : value && typeof value === "object" && Array.isArray((value as { translations?: unknown }).translations)
          ? (value as { translations: unknown[] }).translations
          : null;
      if (!translations) continue;
      translations.slice(0, expectedCount).forEach((translation, index) => {
        if (typeof translation === "string" && translation.trim()) {
          map.set(index, translation.trim());
        }
      });
      if (map.size > 0) break;
    } catch {
      // 继续尝试下一个候选响应。
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
