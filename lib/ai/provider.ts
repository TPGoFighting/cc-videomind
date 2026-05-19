import { z } from "zod";
import {
  ChatAnswerSchema,
  CitationSchema,
  VideoAnalysisSchema,
  type ChatAnswer,
  type KeyMoment,
  type MomentsMode,
  type SummaryTakeaway,
  type TranscriptSegment,
  type VideoAnalysis
} from "@/lib/types";
import { buildAnalysisPrompt, buildChatPrompt } from "@/lib/ai/prompts";
import {
  buildKeyMomentsPrompt,
  buildKeyMomentsChunkPrompt,
  buildKeyMomentsReducePrompt,
  buildStructuredSummaryPrompt
} from "@/lib/ai/prompts-v2";
import { fetchJsonWithTimeout, ExternalServiceError } from "@/lib/utils/http";
import { chunkTranscript } from "@/lib/utils/chunk";
import { extractBalancedJson, repairBrokenJson } from "@/lib/utils/json";
import {
  parseKeyMoments,
  parseSummaryTakeaways,
  validateAndDedupMoments,
  validateSummaryTakeaways
} from "@/lib/utils/moments-validator";

export interface AiProvider {
  generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }): Promise<VideoAnalysis>;
  answerQuestion(input: { question: string; transcript: TranscriptSegment[] }): Promise<ChatAnswer>;
  generateKeyMoments(input: {
    title: string;
    transcript: TranscriptSegment[];
    mode: MomentsMode;
    theme?: string;
    targetLanguage?: "zh" | "en";
  }): Promise<KeyMoment[]>;
  generateStructuredSummary(input: {
    title: string;
    transcript: TranscriptSegment[];
    targetLanguage?: "zh" | "en";
  }): Promise<SummaryTakeaway[]>;
}

const OpenAiChatResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string()
      })
    })
  )
});

const GeminiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(z.object({ text: z.string().optional() }))
      })
    })
  )
});

export class OpenAiCompatibleProvider implements AiProvider {
  constructor(
    private readonly apiKey = requiredEnv("AI_API_KEY").trim(),
    private readonly baseUrl = normalizeOpenAiCompatibleBaseUrl(
      (process.env.AI_API_BASE_URL ?? "https://api.openai.com/v1").trim()
    ),
    private readonly model = (process.env.AI_MODEL ?? "deepseek-v4-flash").trim()
  ) {}

  async generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }) {
    const content = await this.chatJson(buildAnalysisPrompt(input.title, input.transcript));
    const value = parseJsonContent(content);
    const direct = VideoAnalysisSchema.safeParse(value);
    if (direct.success) return direct.data;
    return repairAnalysis(value, input.transcript, direct.error);
  }

  async answerQuestion(input: { question: string; transcript: TranscriptSegment[] }) {
    const content = await this.chatJson(buildChatPrompt(input.question, input.transcript));
    return parseChatAnswer(content, input.transcript);
  }

  async generateKeyMoments(input: {
    title: string;
    transcript: TranscriptSegment[];
    mode: MomentsMode;
    theme?: string;
    targetLanguage?: "zh" | "en";
  }): Promise<KeyMoment[]> {
    const lang = input.targetLanguage ?? "zh";
    const t0 = Date.now();

    // Fast 模式：切片 → 多次 AI → 归并
    if (input.mode === "fast") {
      const chunks = chunkTranscript(input.transcript, { chunkMinutes: 5, overlapSeconds: 45 });
      console.log("[AI:Moments] Fast 模式, chunk 数量: %d", chunks.length);
      const allCandidates: KeyMoment[] = [];

      for (const chunk of chunks) {
        const prompt = buildKeyMomentsChunkPrompt(input.title, chunk.segments, lang, input.theme);
        const content = await this.chatJson(prompt);
        const candidates = parseKeyMoments(content).slice(0, 2);
        console.log("[AI:Moments] Chunk 解析出 %d 候选, AI 响应前200字: %s", candidates.length, content.slice(0, 200));
        allCandidates.push(...candidates);
      }

      console.log("[AI:Moments] 全部候选: %d 条", allCandidates.length);
      if (allCandidates.length === 0) {
        console.warn("[AI:Moments] 无候选, 提前返回");
        return [];
      }

      const reducePrompt = buildKeyMomentsReducePrompt(input.title, allCandidates, input.transcript, lang);
      const reduceContent = await this.chatJson(reducePrompt);
      console.log("[AI:Moments] Reduce 响应前200字: %s", reduceContent.slice(0, 200));
      const final = parseKeyMoments(reduceContent);
      console.log("[AI:Moments] Reduce 解析出 %d 条", final.length);
      const validated = validateAndDedupMoments(final, input.transcript).slice(0, 5);
      console.log("[AI:Moments] 校验去重后: %d 条, 耗时 %dms", validated.length, Date.now() - t0);
      return validated;
    }

    // Smart 模式：全文单次分析
    const prompt = buildKeyMomentsPrompt(input.title, input.transcript, lang, input.theme);
    console.log("[AI:Moments] Smart 模式, prompt 长度: %d 字符", prompt.length);
    const content = await this.chatJson(prompt);
    console.log("[AI:Moments] AI 原始响应长度: %d 字符", content.length);
    console.log("[AI:Moments] AI 原始响应(前500字): %s", content.slice(0, 500));
    const moments = parseKeyMoments(content);
    console.log("[AI:Moments] parseKeyMoments 解析出 %d 条", moments.length);
    if (moments.length > 0) {
      console.log("[AI:Moments] 解析结果:", moments.map(m => ({ title: m.title, timestamp: m.timestamp, quoteLen: m.quote.length })));
    } else {
      console.warn("[AI:Moments] parseKeyMoments 返回空数组! 原始响应可能是无效 JSON 或不满足 schema");
    }
    const validated = validateAndDedupMoments(moments, input.transcript).slice(0, 5);
    console.log("[AI:Moments] validateAndDedupMoments: %d 条 → %d 条, 耗时 %dms", moments.length, validated.length, Date.now() - t0);
    return validated;
  }

  async generateStructuredSummary(input: {
    title: string;
    transcript: TranscriptSegment[];
    targetLanguage?: "zh" | "en";
  }): Promise<SummaryTakeaway[]> {
    const lang = input.targetLanguage ?? "zh";
    const t0 = Date.now();
    const prompt = buildStructuredSummaryPrompt(input.title, input.transcript, lang);
    console.log("[AI:Summary] prompt 长度: %d 字符", prompt.length);
    const content = await this.chatJson(prompt);
    console.log("[AI:Summary] AI 原始响应长度: %d 字符", content.length);
    console.log("[AI:Summary] AI 原始响应(前500字): %s", content.slice(0, 500));
    const takeaways = parseSummaryTakeaways(content);
    console.log("[AI:Summary] parseSummaryTakeaways 解析出 %d 条", takeaways.length);
    if (takeaways.length > 0) {
      console.log("[AI:Summary] 解析结果:", takeaways.map(t => ({ label: t.label, insightLen: t.insight.length, timestamps: t.timestamps })));
    } else {
      console.warn("[AI:Summary] parseSummaryTakeaways 返回空数组! 原始响应可能是无效 JSON 或不满足 schema");
    }
    const validated = validateSummaryTakeaways(takeaways, input.transcript);
    console.log("[AI:Summary] validateSummaryTakeaways: %d 条 → %d 条, 耗时 %dms", takeaways.length, validated.length, Date.now() - t0);
    return validated;
  }

  private async chatJson(prompt: string) {
    const t0 = Date.now();

    const body = {
      model: this.model,
      messages: [
        { role: "system" as const, content: "Return only valid JSON. Ground every output in the provided transcript." },
        { role: "user" as const, content: prompt }
      ]
    };

    // DeepSeek 不支持 response_format，跳过以节省一次重试往返
    if (this.isDeepSeek) {
      const content = await this.tryChat(body);
      if (content) {
        console.log("[AI:Chat] DeepSeek 直连成功, 耗时 %dms, 响应长度 %d", Date.now() - t0, content.length);
        return content;
      }
      console.error("[AI:Chat] 调用失败! model=%s, baseUrl=%s, promptLen=%d", this.model, this.baseUrl, prompt.length);
      throw new Error("AI provider returned no response — check model name, API key, and network connectivity.");
    }

    // OpenAI 兼容模型：先尝试带 response_format（支持结构化输出）
    const withFormat = await this.tryChat({ ...body, response_format: { type: "json_object" as const } });
    if (withFormat) {
      console.log("[AI:Chat] response_format 成功, 耗时 %dms, 响应长度 %d", Date.now() - t0, withFormat.length);
      return withFormat;
    }

    // 400 等错误时回退，不带 response_format
    console.log("[AI:Chat] response_format 失败, 回退到无 format 模式");
    const withoutFormat = await this.tryChat(body);
    if (withoutFormat) {
      console.log("[AI:Chat] 无 format 模式成功, 总耗时 %dms, 响应长度 %d", Date.now() - t0, withoutFormat.length);
      return withoutFormat;
    }

    console.error("[AI:Chat] 两次尝试均失败! model=%s, baseUrl=%s, promptLen=%d", this.model, this.baseUrl, prompt.length);
    throw new Error("AI provider returned no response — check model name, API key, and network connectivity.");
  }

  private get isDeepSeek(): boolean {
    return this.baseUrl.includes("deepseek");
  }

  private async tryChat(body: Record<string, unknown>): Promise<string | null> {
    const t0 = Date.now();
    const model = body.model ?? this.model;
    try {
      const response = OpenAiChatResponseSchema.parse(
        await fetchJsonWithTimeout<unknown>(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          timeoutMs: 60000,
          service: "AI provider",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(body)
        })
      );
      console.log("[AI:Chat] API 调用成功, model=%s, 耗时 %dms", model, Date.now() - t0);
      return response.choices[0]?.message.content ?? null;
    } catch (error) {
      console.error("[AI:Chat] API 调用失败, model=%s, 耗时 %dms", model, Date.now() - t0);
      if (error instanceof ExternalServiceError && error.status === 400) {
        console.warn("[AI:Chat] 400 错误详情:", error.message);
        return null;
      }
      console.error("[AI:Chat] 非400错误:", error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

export class GeminiProvider implements AiProvider {
  constructor(
    private readonly apiKey = requiredEnv("GEMINI_API_KEY").trim(),
    private readonly model = (process.env.GEMINI_MODEL ?? "gemini-1.5-flash").trim()
  ) {}

  async generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }) {
    const content = await this.generateJson(buildAnalysisPrompt(input.title, input.transcript));
    const value = parseJsonContent(content);
    const direct = VideoAnalysisSchema.safeParse(value);
    if (direct.success) return direct.data;
    return repairAnalysis(value, input.transcript, direct.error);
  }

  async answerQuestion(input: { question: string; transcript: TranscriptSegment[] }) {
    const content = await this.generateJson(buildChatPrompt(input.question, input.transcript));
    return parseChatAnswer(content, input.transcript);
  }

  async generateKeyMoments(input: {
    title: string;
    transcript: TranscriptSegment[];
    mode: MomentsMode;
    theme?: string;
    targetLanguage?: "zh" | "en";
  }): Promise<KeyMoment[]> {
    const lang = input.targetLanguage ?? "zh";

    if (input.mode === "fast") {
      const chunks = chunkTranscript(input.transcript, { chunkMinutes: 5, overlapSeconds: 45 });
      const allCandidates: KeyMoment[] = [];

      for (const chunk of chunks) {
        const prompt = buildKeyMomentsChunkPrompt(input.title, chunk.segments, lang, input.theme);
        const content = await this.generateJson(prompt);
        const candidates = parseKeyMoments(content).slice(0, 2);
        allCandidates.push(...candidates);
      }

      if (allCandidates.length === 0) return [];

      const reducePrompt = buildKeyMomentsReducePrompt(input.title, allCandidates, input.transcript, lang);
      const reduceContent = await this.generateJson(reducePrompt);
      const final = parseKeyMoments(reduceContent);
      return validateAndDedupMoments(final, input.transcript).slice(0, 5);
    }

    const prompt = buildKeyMomentsPrompt(input.title, input.transcript, lang, input.theme);
    const content = await this.generateJson(prompt);
    const moments = parseKeyMoments(content);
    return validateAndDedupMoments(moments, input.transcript).slice(0, 5);
  }

  async generateStructuredSummary(input: {
    title: string;
    transcript: TranscriptSegment[];
    targetLanguage?: "zh" | "en";
  }): Promise<SummaryTakeaway[]> {
    const lang = input.targetLanguage ?? "zh";
    const prompt = buildStructuredSummaryPrompt(input.title, input.transcript, lang);
    const content = await this.generateJson(prompt);
    const takeaways = parseSummaryTakeaways(content);
    return validateSummaryTakeaways(takeaways, input.transcript);
  }

  private async generateJson(prompt: string) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const response = GeminiResponseSchema.parse(
      await fetchJsonWithTimeout<unknown>(endpoint, {
        method: "POST",
        timeoutMs: 60000,
        service: "Gemini",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      })
    );

    return response.candidates[0]?.content.parts.map((part) => part.text ?? "").join("") ?? "{}";
  }
}

export function getAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (provider === "openai-compatible" || provider === "deepseek") {
    return new OpenAiCompatibleProvider();
  }
  if (provider === "gemini") {
    return new GeminiProvider();
  }

  throw new Error(`AI_PROVIDER "${provider || "(not set)"}" is invalid. Set to "openai-compatible", "deepseek", or "gemini".`);
}

function parseJsonContent(content: string) {
  // 先尝试直接解析
  try {
    return JSON.parse(content) as unknown;
  } catch {
    // 继续
  }

  // 括号计数法提取 —— 比贪心正则更可靠，正确处理嵌套和字符串
  const extracted = extractBalancedJson(content);
  if (extracted) {
    try {
      return JSON.parse(extracted) as unknown;
    } catch {
      // 继续尝试修复
    }

    // JSON 解析失败时尝试修复常见问题：尾部逗号、单引号等
    const repaired = repairBrokenJson(extracted);
    if (repaired) {
      try {
        return JSON.parse(repaired) as unknown;
      } catch {
        // 最终失败
      }
    }
  }

  throw new Error("AI provider did not return valid JSON.");
}

function repairAnalysis(
  value: unknown,
  transcript: TranscriptSegment[],
  zodError: z.ZodError
): VideoAnalysis {
  if (!isRecord(value)) throw zodError;

  const summary = getString(value, ["summary", "description", "overview"]) ?? "";
  const takeaways = getStringArray(value, ["takeaways", "keyPoints", "key_points", "points"]) ?? [];
  const suggestedQuestions = getStringArray(value, ["suggestedQuestions", "questions", "suggested_questions"]) ?? [];
  const highlights = getHighlights(value);

  const repaired = VideoAnalysisSchema.safeParse({
    summary: summary || `关于 "${transcript.slice(0, 3).map((s) => s.text).join(" ")}" 的视频分析`,
    takeaways: takeaways.length >= 3 ? takeaways : generateDefaultTakeaways(transcript),
    suggestedQuestions: suggestedQuestions.length >= 3 ? suggestedQuestions : generateDefaultQuestions(transcript),
    highlights: highlights.length >= 5 ? highlights : generateDefaultHighlights(transcript)
  });

  if (repaired.success) return repaired.data;
  throw zodError;
}

function getStringArray(record: Record<string, unknown>, keys: string[]): string[] | null {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      if (strings.length > 0) return strings;
    }
  }
  return null;
}

function getHighlights(value: Record<string, unknown>): Array<Record<string, unknown>> {
  const raw = value.highlights ?? value.keyMoments ?? value.key_moments ?? [];
  if (!Array.isArray(raw)) return [];

  return raw.filter(isRecord).map((h) => ({
    startTime: getNumber(h, ["startTime", "start", "start_time", "startSeconds"]),
    endTime: getNumber(h, ["endTime", "end", "end_time", "endSeconds"]),
    title: getString(h, ["title", "heading", "name"]) ?? "",
    quote: getString(h, ["quote", "text", "excerpt", "evidence"]) ?? "",
    reason: getString(h, ["reason", "explanation", "description", "note"]) ?? ""
  }));
}

function generateDefaultTakeaways(transcript: TranscriptSegment[]): string[] {
  if (transcript.length === 0) return ["无法生成要点：字幕为空"];
  const mid = Math.floor(transcript.length / 2);
  return [
    transcript.slice(0, 10).map((s) => s.text).join(" ").slice(0, 200),
    transcript.slice(mid, mid + 10).map((s) => s.text).join(" ").slice(0, 200),
    transcript.slice(-10).map((s) => s.text).join(" ").slice(0, 200)
  ];
}

function generateDefaultQuestions(transcript: TranscriptSegment[]): string[] {
  if (transcript.length === 0) return ["无法生成问题：字幕为空"];
  return [
    "视频的主要内容是什么？",
    "有哪些关键观点或发现？",
    "作者得出了什么结论？"
  ];
}

function generateDefaultHighlights(transcript: TranscriptSegment[]): Array<Record<string, unknown>> {
  if (transcript.length < 5) return [];
  const step = Math.max(1, Math.floor(transcript.length / 6));
  const highlights: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 6; i++) {
    const idx = Math.min(i * step, transcript.length - 1);
    const seg = transcript[idx];
    highlights.push({
      startTime: seg.startTime,
      endTime: Math.min(seg.endTime, seg.startTime + 30),
      title: `第 ${i + 1} 段`,
      quote: seg.text.slice(0, 220),
      reason: "从字幕中自动提取"
    });
  }
  return highlights;
}

function parseChatAnswer(content: string, transcript: TranscriptSegment[]) {
  const value = parseJsonContent(content);
  const direct = ChatAnswerSchema.safeParse(value);
  if (direct.success) {
    return direct.data;
  }

  if (!isRecord(value)) {
    throw direct.error;
  }

  const answer = typeof value.answer === "string" ? value.answer : "";
  const rawCitations = Array.isArray(value.citations) ? value.citations : [];
  const citations = rawCitations
    .map((citation) => normalizeCitation(citation, transcript))
    .filter((citation): citation is NonNullable<typeof citation> => citation !== null);

  if (citations.length === 0 && transcript[0]) {
    citations.push({
      startTime: transcript[0].startTime,
      endTime: transcript[0].endTime,
      quote: transcript[0].text.slice(0, 220)
    });
  }

  return ChatAnswerSchema.parse({ answer, citations: citations.slice(0, 5) });
}

function normalizeCitation(value: unknown, transcript: TranscriptSegment[]) {
  if (typeof value === "string") {
    const range = parseTimestampRange(value);
    if (!range) {
      return null;
    }

    return CitationSchema.parse({
      ...range,
      quote: findQuoteForRange(range.startTime, transcript)
    });
  }

  if (!isRecord(value)) {
    return null;
  }

  const quote = getString(value, ["quote", "text", "evidence", "excerpt"]) ?? "";
  const directRange = {
    startTime: getNumber(value, ["startTime", "start", "start_time", "startSeconds", "start_seconds"]),
    endTime: getNumber(value, ["endTime", "end", "end_time", "endSeconds", "end_seconds"])
  };
  const range =
    directRange.startTime !== null && directRange.endTime !== null
      ? directRange
      : parseTimestampRange(getString(value, ["timestamp", "time", "range", "timestampRange"]) ?? "");

  const matchedSegment = quote ? findSegmentForQuote(quote, transcript) : null;
  const startTime = range?.startTime ?? matchedSegment?.startTime;
  const endTime = range?.endTime ?? matchedSegment?.endTime;

  if (startTime === undefined || endTime === undefined) {
    return null;
  }

  return CitationSchema.parse({
    startTime,
    endTime,
    quote: quote || findQuoteForRange(startTime, transcript)
  });
}

function parseTimestampRange(value: string) {
  const match = value.match(/(\d+:)?\d{1,2}:\d{2}|\d+(?:\.\d+)?/g);
  if (!match || match.length === 0) {
    return null;
  }

  const startTime = parseTimestamp(match[0]);
  const endTime = match[1] ? parseTimestamp(match[1]) : startTime + 30;
  return { startTime, endTime };
}

function parseTimestamp(value: string) {
  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

function findSegmentForQuote(quote: string, transcript: TranscriptSegment[]) {
  const normalizedQuote = quote.toLowerCase();
  return (
    transcript.find((segment) => segment.text.toLowerCase().includes(normalizedQuote.slice(0, 60))) ??
    null
  );
}

function findQuoteForRange(startTime: number, transcript: TranscriptSegment[]) {
  const segment =
    transcript.find((item) => item.startTime <= startTime && item.endTime >= startTime) ?? transcript[0];
  return segment?.text.slice(0, 220) ?? "Transcript citation unavailable.";
}

function getString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function getNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredEnv(name: string) {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(`${name} is not configured.`);
  }
  return raw.trim();
}

function normalizeOpenAiCompatibleBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/$/, "");

  try {
    const url = new URL(trimmed);
    if (url.hostname === "platform.deepseek.com" || url.hostname === "api.deepseek.com") {
      return "https://api.deepseek.com";
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}
