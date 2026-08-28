import { z } from "zod";
import {
  ChatAnswerSchema,
  CitationSchema,
  VideoAnalysisSchema,
  WordDefinitionSchema,
  GrammarAnalysisSchema,
  type ChatAnswer,
  type GenerationDebug,
  type KeyMoment,
  type MomentsMode,
  type SummaryTakeaway,
  type TranscriptSegment,
  type VideoAnalysis,
  type WordDefinition,
  type GrammarAnalysis
} from "@/lib/types";
import { buildAnalysisPrompt, buildChatPrompt, buildRagChatPrompt } from "@/lib/ai/prompts";
import type { RetrievedChunk } from "@/lib/embedding/retriever";
import {
  buildKeyMomentsPrompt,
  buildKeyMomentsChunkPrompt,
  buildKeyMomentsReducePrompt,
  buildStructuredSummaryPrompt,
  buildStructuredSummaryChunkPrompt,
  buildStructuredSummaryReducePrompt,
} from "@/lib/ai/prompts-v2";
import {
  buildComprehensiveChunkPrompt,
  buildComprehensivePrompt,
  buildComprehensiveReducePrompt,
} from "@/lib/ai/prompts-comprehensive";
import {
  buildWordDefinitionsPrompt,
  buildTranscriptTranslationPrompt,
  buildGrammarAnalysisPrompt,
  parseIndexedTranslation
} from "@/lib/ai/prompts-learn";
import { fetchJsonWithTimeout, ExternalServiceError } from "@/lib/utils/http";
import { getModelFallbackChain } from "@/lib/ai/provider-registry";
import { chunkTranscript } from "@/lib/utils/chunk";
import { extractBalancedJson, extractJsonFromThinking, repairBrokenJson } from "@/lib/utils/json";
import {
  parseKeyMoments,
  parseSummaryTakeaways,
  validateAndDedupMoments,
  validateSummaryTakeaways
} from "@/lib/utils/moments-validator";

const isAiDebug =
  process.env.DEBUG_AI === "true" || process.env.NODE_ENV !== "production";

function debugLog(...args: unknown[]): void {
  if (isAiDebug) {
    console.log(...args);
  }
}

const RETRYABLE_PROVIDER_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const SURFACE_PROVIDER_STATUSES = new Set([401, 402, 403, 429]);
const DEFAULT_PROVIDER_MIN_INTERVAL_MS = 1_500;
const DEFAULT_PROVIDER_RETRY_BASE_MS = 1_500;

type ProviderRequestGate = {
  tail: Promise<void>;
  nextStartAt: number;
};

const providerRequestGates = new Map<string, ProviderRequestGate>();

function getConfiguredDelay(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function waitFor(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withProviderRequestGate<T>(
  baseUrl: string,
  operation: () => Promise<T>,
  lane = "default",
): Promise<T> {
  const key = `${baseUrl.replace(/\/$/, "")}::${lane}`;
  const gate = providerRequestGates.get(key) ?? { tail: Promise.resolve(), nextStartAt: 0 };
  const previous = gate.tail;
  let release!: () => void;
  gate.tail = new Promise<void>((resolve) => {
    release = resolve;
  });
  providerRequestGates.set(key, gate);

  await previous;
  try {
    const intervalMs = getConfiguredDelay("AI_PROVIDER_MIN_INTERVAL_MS", DEFAULT_PROVIDER_MIN_INTERVAL_MS);
    await waitFor(Math.max(0, gate.nextStartAt - Date.now()));
    gate.nextStartAt = Date.now() + intervalMs;
    return await operation();
  } finally {
    release();
  }
}

export type JsonParseMode = "direct" | "extracted" | "repaired" | "thinking" | "thinking_repaired";

export type ChatAnswerWithDiagnostics = ChatAnswer & {
  diagnostics: {
    jsonParseMode: JsonParseMode;
    citationNormalized: boolean;
  };
};

export interface AiProvider {
  generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }): Promise<VideoAnalysis>;
  answerQuestion(input: { question: string; transcript: TranscriptSegment[]; chunks?: RetrievedChunk[] }): Promise<ChatAnswerWithDiagnostics>;
  generateKeyMoments(input: {
    title: string;
    transcript: TranscriptSegment[];
    mode: MomentsMode;
    theme?: string;
    targetLanguage?: "zh" | "en";
    debug?: GenerationDebug;
  }): Promise<KeyMoment[]>;
  generateStructuredSummary(input: {
    title: string;
    transcript: TranscriptSegment[];
    targetLanguage?: "zh" | "en";
    debug?: GenerationDebug;
  }): Promise<SummaryTakeaway[]>;

  generateComprehensiveAnalysis(input: {
    title: string;
    transcript: TranscriptSegment[];
  }): Promise<ComprehensiveAnalysis>;

  /** 批量生成词义定义 */
  defineWords(input: { lemmas: string[] }): Promise<WordDefinition[]>;

  /** 翻译转录文本为中文或英文 */
  translateTranscript(input: { segments: TranscriptSegment[]; targetLanguage?: string }): Promise<TranscriptSegment[]>;
  generateGrammarAnalysis(input: { sentence: string }): Promise<GrammarAnalysis>;
}

/**
 * Keeps the configured provider as the primary path while allowing a separate
 * environment-configured provider to recover from provider-side outages,
 * quota blocks, and transient response failures.
 */
export class FallbackAiProvider implements AiProvider {
  constructor(
    private readonly primary: AiProvider,
    private readonly fallback: AiProvider,
  ) {}

  private async run<T>(
    operation: string,
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (primaryError) {
      console.warn(
        "[AI:Fallback] %s 主模型失败，切换备用模型: %s",
        operation,
        primaryError instanceof Error ? primaryError.message : "unknown error",
      );
      return fallbackOperation();
    }
  }

  generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }): Promise<VideoAnalysis> {
    return this.run(
      "analysis",
      () => this.primary.generateAnalysis(input),
      () => this.fallback.generateAnalysis(input),
    );
  }

  answerQuestion(input: { question: string; transcript: TranscriptSegment[]; chunks?: RetrievedChunk[] }): Promise<ChatAnswerWithDiagnostics> {
    return this.run(
      "chat",
      () => this.primary.answerQuestion(input),
      () => this.fallback.answerQuestion(input),
    );
  }

  generateKeyMoments(input: {
    title: string;
    transcript: TranscriptSegment[];
    mode: MomentsMode;
    theme?: string;
    targetLanguage?: "zh" | "en";
    debug?: GenerationDebug;
  }): Promise<KeyMoment[]> {
    return this.run(
      "moments",
      () => this.primary.generateKeyMoments(input),
      () => this.fallback.generateKeyMoments(input),
    );
  }

  generateStructuredSummary(input: {
    title: string;
    transcript: TranscriptSegment[];
    targetLanguage?: "zh" | "en";
    debug?: GenerationDebug;
  }): Promise<SummaryTakeaway[]> {
    return this.run(
      "summary",
      () => this.primary.generateStructuredSummary(input),
      () => this.fallback.generateStructuredSummary(input),
    );
  }

  generateComprehensiveAnalysis(input: {
    title: string;
    transcript: TranscriptSegment[];
  }): Promise<ComprehensiveAnalysis> {
    return this.run(
      "comprehensive",
      () => this.primary.generateComprehensiveAnalysis(input),
      () => this.fallback.generateComprehensiveAnalysis(input),
    );
  }

  defineWords(input: { lemmas: string[] }): Promise<WordDefinition[]> {
    return this.run(
      "word-definitions",
      () => this.primary.defineWords(input),
      () => this.fallback.defineWords(input),
    );
  }

  translateTranscript(input: { segments: TranscriptSegment[]; targetLanguage?: string }): Promise<TranscriptSegment[]> {
    return this.run(
      "translation",
      () => this.primary.translateTranscript(input),
      () => this.fallback.translateTranscript(input),
    );
  }

  generateGrammarAnalysis(input: { sentence: string }): Promise<GrammarAnalysis> {
    return this.run(
      "grammar-analysis",
      () => this.primary.generateGrammarAnalysis(input),
      () => this.fallback.generateGrammarAnalysis(input),
    );
  }
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

export const ComprehensiveAnalysisSchema = z.object({
  summary: z.string(),
  takeaways: z.array(z.object({
    label: z.string(),
    label_zh: z.string().optional(),
    insight: z.string(),
    insight_zh: z.string().optional(),
    timestamps: z.array(z.string()).optional(),
  })),
  moments: z.array(z.object({
    title: z.string(),
    title_zh: z.string().optional(),
    timestamp: z.string(),
    quote: z.string(),
    quote_zh: z.string().optional(),
    reason: z.string(),
    reason_zh: z.string().optional(),
  })),
  highlights: z.array(z.object({
    startTime: z.number(),
    endTime: z.number(),
    title: z.string(),
    quote: z.string(),
    reason: z.string(),
  })),
  suggestedQuestions: z.array(z.string()),
});

export type ComprehensiveAnalysis = z.infer<typeof ComprehensiveAnalysisSchema>;

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly modelChain: string[];
  private readonly requestTimeoutMs: number;
  private readonly translationTimeoutMs: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    primaryModel: string,
    fallbackModels?: string[],
    options: {
      requestTimeoutMs?: number;
      translationTimeoutMs?: number;
      maxAttempts?: number;
    } = {},
  ) {
    this.model = primaryModel;
    this.modelChain = [primaryModel, ...(fallbackModels ?? []).filter(m => m !== primaryModel)];
    // 兼容网关的复杂 JSON 请求偶尔需要超过 30 秒；分析接口本身有独立的
    // 长任务预算，给模型足够时间返回完整结构，避免过早切到不可用的备用模型。
    this.requestTimeoutMs = options.requestTimeoutMs ?? 90_000;
    // A translation page is deliberately small and should hand control back to
    // the workspace quickly when a compatibility gateway stops responding.
    this.translationTimeoutMs = options.translationTimeoutMs ?? 25_000;
    this.maxAttempts = options.maxAttempts ?? 2;
  }

  private model: string;

  async generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }) {
    const content = await this.chatJson(buildAnalysisPrompt(input.title, input.transcript));
    const value = parseJsonContent(content);
    const direct = VideoAnalysisSchema.safeParse(value);
    if (direct.success) return direct.data;
    return repairAnalysis(value, input.transcript, direct.error);
  }

  async generateGrammarAnalysis(input: { sentence: string }): Promise<GrammarAnalysis> {
    const content = await this.chatJson(buildGrammarAnalysisPrompt(input.sentence));
    return parseGrammarAnalysis(content, input.sentence);
  }

  async answerQuestion(input: { question: string; transcript: TranscriptSegment[]; chunks?: RetrievedChunk[] }) {
    const prompt = input.chunks?.length
      ? buildRagChatPrompt(input.question, input.chunks)
      : buildChatPrompt(input.question, input.transcript);
    const content = await this.chatJson(prompt);
    return parseChatAnswer(content, input.transcript);
  }

  async generateKeyMoments(input: {
    title: string;
    transcript: TranscriptSegment[];
    mode: MomentsMode;
    theme?: string;
    targetLanguage?: "zh" | "en";
    debug?: GenerationDebug;
  }): Promise<KeyMoment[]> {
    const lang = input.targetLanguage ?? "zh";
    const t0 = Date.now();

    // Fast 模式：切片 → 并发 AI 调用 → 归并
    if (input.mode === "fast") {
      const chunks = chunkTranscript(input.transcript, { chunkMinutes: 5, overlapSeconds: 45 });
      debugLog("[AI:Moments] Fast 模式, chunk 数量: %d", chunks.length);

      const chunkResults = await runConcurrent(3, chunks, async (chunk) => {
        const prompt = buildKeyMomentsChunkPrompt(input.title, chunk.segments, lang, input.theme);
        const content = await this.chatJson(prompt);
        const candidates = parseKeyMoments(content).slice(0, 2);
        debugLog("[AI:Moments] Chunk 解析出 %d 候选, AI 响应前200字: %s", candidates.length, content.slice(0, 200));
        return candidates;
      });
      const allCandidates = chunkResults.flat();

      debugLog("[AI:Moments] 全部候选: %d 条", allCandidates.length);
      if (allCandidates.length === 0) {
        debugLog("[AI:Moments] 无候选, 提前返回");
        if (input.debug) fillDebug(input.debug, { model: this.model, finalCount: 0 });
        return [];
      }

      const reducePrompt = buildKeyMomentsReducePrompt(input.title, allCandidates, input.transcript, lang);
      const reduceContent = await this.chatJson(reducePrompt);
      debugLog("[AI:Moments] Reduce 响应前200字: %s", reduceContent.slice(0, 200));
      const final = parseKeyMoments(reduceContent);
      debugLog("[AI:Moments] Reduce 解析出 %d 条", final.length);
      const validated = validateAndDedupMoments(final, input.transcript).slice(0, 5);
      debugLog("[AI:Moments] 校验去重后: %d 条, 耗时 %dms", validated.length, Date.now() - t0);
      if (input.debug) {
        fillDebug(input.debug, {
          model: this.model,
          promptLength: reducePrompt.length,
          rawResponseLength: reduceContent.length,
          rawResponsePreview: reduceContent.slice(0, 300),
          parseCount: final.length,
          validateCount: validated.length,
          finalCount: validated.length
        });
      }
      return validated;
    }

    // Smart 模式：全文单次分析
    const prompt = buildKeyMomentsPrompt(input.title, input.transcript, lang, input.theme);
    debugLog("[AI:Moments] Smart 模式, prompt 长度: %d 字符", prompt.length);
    const content = await this.chatJson(prompt);
    debugLog("[AI:Moments] AI 原始响应长度: %d 字符", content.length);
    debugLog("[AI:Moments] AI 原始响应(前500字): %s", content.slice(0, 500));
    const moments = parseKeyMoments(content);
    debugLog("[AI:Moments] parseKeyMoments 解析出 %d 条", moments.length);
    if (moments.length > 0) {
      debugLog("[AI:Moments] 解析结果:", moments.map(m => ({ title: m.title, timestamp: m.timestamp, quoteLen: m.quote.length })));
    } else {
      debugLog("[AI:Moments] parseKeyMoments 返回空数组! 原始响应可能是无效 JSON 或不满足 schema");
    }
    const validated = validateAndDedupMoments(moments, input.transcript).slice(0, 5);
    debugLog("[AI:Moments] validateAndDedupMoments: %d 条 → %d 条, 耗时 %dms", moments.length, validated.length, Date.now() - t0);
    if (input.debug) {
      fillDebug(input.debug, {
        model: this.model,
        promptLength: prompt.length,
        rawResponseLength: content.length,
        rawResponsePreview: content.slice(0, 300),
        parseCount: moments.length,
        validateCount: validated.length,
        finalCount: validated.length
      });
    }
    return validated;
  }

  async generateStructuredSummary(input: {
    title: string;
    transcript: TranscriptSegment[];
    targetLanguage?: "zh" | "en";
    debug?: GenerationDebug;
  }): Promise<SummaryTakeaway[]> {
    const lang = input.targetLanguage ?? "zh";
    const t0 = Date.now();
    const prompt = buildStructuredSummaryPrompt(input.title, input.transcript, lang);
    debugLog("[AI:Summary] prompt 长度: %d 字符", prompt.length);
    const content = await this.chatJson(prompt);
    debugLog("[AI:Summary] AI 原始响应长度: %d 字符", content.length);
    debugLog("[AI:Summary] AI 原始响应(前500字): %s", content.slice(0, 500));
    const takeaways = parseSummaryTakeaways(content);
    debugLog("[AI:Summary] parseSummaryTakeaways 解析出 %d 条", takeaways.length);
    if (takeaways.length > 0) {
      debugLog("[AI:Summary] 解析结果:", takeaways.map(t => ({ label: t.label, insightLen: t.insight.length, timestamps: t.timestamps })));
    } else {
      debugLog("[AI:Summary] parseSummaryTakeaways 返回空数组! 原始响应可能是无效 JSON 或不满足 schema");
    }
    const validated = validateSummaryTakeaways(takeaways, input.transcript);
    debugLog("[AI:Summary] validateSummaryTakeaways: %d 条 → %d 条, 耗时 %dms", takeaways.length, validated.length, Date.now() - t0);
    if (input.debug) {
      fillDebug(input.debug, {
        model: this.model,
        promptLength: prompt.length,
        rawResponseLength: content.length,
        rawResponsePreview: content.slice(0, 300),
        parseCount: takeaways.length,
        validateCount: validated.length,
        finalCount: validated.length
      });
    }
    return validated;
  }

  async generateComprehensiveAnalysis(input: {
    title: string;
    transcript: TranscriptSegment[];
  }): Promise<ComprehensiveAnalysis> {
    return generateComprehensiveInStages(input, (prompt) => this.chatJson(prompt));
  }

  async defineWords(input: { lemmas: string[] }): Promise<WordDefinition[]> {
    if (input.lemmas.length === 0) return [];

    const BATCH_SIZE = 30;
    const batches: string[][] = [];
    for (let i = 0; i < input.lemmas.length; i += BATCH_SIZE) {
      batches.push(input.lemmas.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await runConcurrent(3, batches, async (batch) => {
      const prompt = buildWordDefinitionsPrompt(batch);
      const content = await this.chatJson(prompt);
      const value = parseJsonContent(content);

      if (isRecord(value) && Array.isArray(value.definitions)) {
        return value.definitions
          .filter(isRecord)
          .map((d) => {
            const result = WordDefinitionSchema.safeParse({
              lemma: d.lemma ?? "",
              phonetic: d.phonetic,
              partOfSpeech: d.partOfSpeech,
              definitionZh: d.definitionZh ?? "",
              definitionEn: d.definitionEn,
              exampleEn: d.exampleEn,
              exampleZh: d.exampleZh,
            });
            return result.success ? result.data : null;
          })
          .filter((d): d is WordDefinition => d !== null);
      }
      return [];
    });

    return batchResults.flat();
  }

  async translateTranscript(input: { segments: TranscriptSegment[]; targetLanguage?: string }): Promise<TranscriptSegment[]> {
    if (input.segments.length === 0) return [];

    const targetLang = input.targetLanguage || "zh-CN";
    const prompt = buildTranscriptTranslationPrompt(input.segments, targetLang);
    const content = await this.chatTranslation(prompt);
    const parsed = parseIndexedTranslation(content, input.segments.length);

    // 回退：未翻译到的句子保留英文原文，不会空白
    return input.segments.map((seg, i) => ({
      ...seg,
      text_zh: parsed.get(i) ?? seg.text
    }));
  }

  /** 翻译专用聊天（不使用 JSON mode，解析索引格式） */
  private async chatTranslation(prompt: string): Promise<string> {
    const t0 = Date.now();
    const body = {
      model: this.model,
      messages: [
        { role: "system" as const, content: "你是一位专业翻译。只输出要求的格式，不要加任何解释。" },
        { role: "user" as const, content: prompt }
      ],
      // 翻译页只包含少量字幕。限制输出预算可避免兼容模型进入长推理，
      // 让单页在备用模型排队时仍能及时完成并交给下一页继续处理。
      max_tokens: 2_048,
    };

    // 直接调 tryChat，不强制 JSON mode
    const content = await this.tryChat(body, this.translationTimeoutMs, true, "translation");
    if (content) {
      debugLog("[AI:Translation] 耗时 %dms, 响应长度 %d", Date.now() - t0, content.length);
      return content;
    }

    console.error("[AI:Translation] 调用失败! model=%s", this.model);
    throw new Error("AI 翻译返回空响应");
  }

  private async chatJson(prompt: string) {
    const t0 = Date.now();
    const messages = [
      { role: "system" as const, content: "Return only valid JSON. Ground every output in the provided transcript." },
      { role: "user" as const, content: prompt }
    ];

    const lastErrorMessages: string[] = [];

    // 按模型链尝试，主模型失败后自动切换备选
    for (const modelName of this.modelChain) {
      const body = { model: modelName, messages };

      // 先尝试带 response_format（快速失败，30s 超时）
      const withFormat = await this.tryChat({ ...body, response_format: { type: "json_object" as const } }, this.requestTimeoutMs);
      if (withFormat) {
        if (modelName !== this.model) debugLog("[AI:Fallback] 切换到 %s 成功", modelName);
        debugLog("[AI:Chat] model=%s, 耗时 %dms, 响应长度 %d", modelName, Date.now() - t0, withFormat.length);
        return withFormat;
      }

      // 不带 response_format 再试（30s 超时）
      const withoutFormat = await this.tryChat(body, this.requestTimeoutMs);
      if (withoutFormat) {
        if (modelName !== this.model) debugLog("[AI:Fallback] 切换到 %s 成功 (no-format)", modelName);
        debugLog("[AI:Chat] model=%s (no-format), 耗时 %dms, 响应长度 %d", modelName, Date.now() - t0, withoutFormat.length);
        return withoutFormat;
      }

      lastErrorMessages.push(`${modelName}: no response`);
    }

    console.error("[AI:Chat] 所有模型均失败! chain=%s, baseUrl=%s, errors=%s",
      this.modelChain.join(","), this.baseUrl, lastErrorMessages.join(" | "));
    throw new Error(`AI provider returned no response — tried ${this.modelChain.length} models.`);
  }

  private get isDeepSeek(): boolean {
    return this.baseUrl.includes("deepseek");
  }

  private async tryChat(
    body: Record<string, unknown>,
    timeoutMs = 60_000,
    throwOnError = false,
    lane = "default",
  ): Promise<string | null> {
    const t0 = Date.now();
    const model = body.model ?? this.model;
    const endpoint = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const maxAttempts = this.maxAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = OpenAiChatResponseSchema.parse(
          await withProviderRequestGate(this.baseUrl, () => fetchJsonWithTimeout<unknown>(endpoint, {
            method: "POST",
            timeoutMs,
            service: "AI provider",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
          }), lane)
        );
        debugLog("[AI:Chat] API 调用成功, model=%s, 耗时 %dms", model, Date.now() - t0);
        return response.choices[0]?.message.content ?? null;
      } catch (error) {
        const errStatus = error instanceof ExternalServiceError ? error.status : undefined;
        const retryable = error instanceof ExternalServiceError
          && errStatus !== undefined
          && RETRYABLE_PROVIDER_STATUSES.has(errStatus);
        if (retryable && attempt < maxAttempts) {
          const retryBaseMs = getConfiguredDelay("AI_PROVIDER_RETRY_BASE_MS", DEFAULT_PROVIDER_RETRY_BASE_MS);
          await waitFor(retryBaseMs * 2 ** (attempt - 1));
          continue;
        }

        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[AI:Chat] API 调用失败, model=%s, status=%s, error=%s, 耗时 %dms",
          model, errStatus ?? "N/A", errMsg, Date.now() - t0);
        // 没有状态码通常代表网络失败或超时。继续尝试相同请求没有收益，
        // 还会把一次等待放大成两次，延迟备用模型接管。
        if (throwOnError || errStatus === undefined || (errStatus !== undefined && SURFACE_PROVIDER_STATUSES.has(errStatus))) {
          throw error;
        }
        return null;
      }
    }

    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AnthropicProvider — Anthropic 原生 API（Claude / LongCat 等）
// ═══════════════════════════════════════════════════════════════════════════════

export class AnthropicProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly fallbackModels: string[] = [],
  ) {}

  async generateGrammarAnalysis(input: { sentence: string }): Promise<GrammarAnalysis> {
    const content = await this.chatJson(buildGrammarAnalysisPrompt(input.sentence));
    return parseGrammarAnalysis(content, input.sentence);
  }

  async generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }) {
    const content = await this.chatJson(buildAnalysisPrompt(input.title, input.transcript));
    const value = parseJsonContent(content);
    const direct = VideoAnalysisSchema.safeParse(value);
    if (direct.success) return direct.data;
    return repairAnalysis(value, input.transcript, direct.error);
  }

  async answerQuestion(input: { question: string; transcript: TranscriptSegment[]; chunks?: RetrievedChunk[] }) {
    const prompt = input.chunks?.length
      ? buildRagChatPrompt(input.question, input.chunks)
      : buildChatPrompt(input.question, input.transcript);
    const content = await this.chatJson(prompt);
    return parseChatAnswer(content, input.transcript);
  }

  async generateKeyMoments(input: {
    title: string;
    transcript: TranscriptSegment[];
    mode: MomentsMode;
    theme?: string;
    targetLanguage?: "zh" | "en";
    debug?: GenerationDebug;
  }): Promise<KeyMoment[]> {
    const lang = input.targetLanguage ?? "zh";

    if (input.mode === "fast") {
      const chunks = chunkTranscript(input.transcript, { chunkMinutes: 5, overlapSeconds: 45 });

      const chunkResults = await runConcurrent(3, chunks, async (chunk) => {
        const prompt = buildKeyMomentsChunkPrompt(input.title, chunk.segments, lang, input.theme);
        const content = await this.chatJson(prompt);
        const candidates = parseKeyMoments(content).slice(0, 2);
        return candidates;
      });
      const allCandidates = chunkResults.flat();

      if (allCandidates.length === 0) {
        if (input.debug) fillDebug(input.debug, { model: this.model, finalCount: 0 });
        return [];
      }

      const reducePrompt = buildKeyMomentsReducePrompt(input.title, allCandidates, input.transcript, lang);
      const reduceContent = await this.chatJson(reducePrompt);
      const final = parseKeyMoments(reduceContent);
      const validated = validateAndDedupMoments(final, input.transcript).slice(0, 5);
      if (input.debug) {
        fillDebug(input.debug, {
          model: this.model,
          promptLength: reducePrompt.length,
          rawResponseLength: reduceContent.length,
          rawResponsePreview: reduceContent.slice(0, 300),
          parseCount: final.length,
          validateCount: validated.length,
        });
      }
      return validated;
    }

    // smart mode
    const prompt = buildKeyMomentsPrompt(input.title, input.transcript, lang, input.theme);
    const content = await this.chatJson(prompt);
    const parsed = parseKeyMoments(content);
    const validated = validateAndDedupMoments(parsed, input.transcript).slice(0, 8);
    if (input.debug) {
      fillDebug(input.debug, {
        model: this.model,
        promptLength: prompt.length,
        rawResponseLength: content.length,
        rawResponsePreview: content.slice(0, 300),
        parseCount: parsed.length,
        validateCount: validated.length,
      });
    }
    return validated;
  }

  async generateStructuredSummary(input: {
    title: string;
    transcript: TranscriptSegment[];
    targetLanguage?: "zh" | "en";
  }): Promise<SummaryTakeaway[]> {
    const lang = input.targetLanguage ?? "zh";

    // Chunk-then-reduce for large transcripts
    if (input.transcript.length > 200) {
      const chunks = chunkTranscript(input.transcript, { chunkMinutes: 5, overlapSeconds: 45 });
      debugLog("[AI:Summary] 长字幕 chunk 模式, chunk 数量: %d", chunks.length);

      const chunkResults = await runConcurrent(3, chunks, async (chunk) => {
        const prompt = buildStructuredSummaryChunkPrompt(input.title, chunk.segments, lang);
        const content = await this.chatJson(prompt);
        return parseSummaryTakeaways(content);
      });

      const allCandidates = chunkResults.flat();
      debugLog("[AI:Summary] Chunk 候选合计: %d 条", allCandidates.length);

      if (allCandidates.length === 0) {
        return [];
      }

      if (allCandidates.length <= 6) {
        return validateSummaryTakeaways(allCandidates, input.transcript).slice(0, 6);
      }

      // Reduce: merge candidates into final summary
      const reducePrompt = buildStructuredSummaryReducePrompt(input.title, allCandidates, lang);
      const reducedContent = await this.chatJson(reducePrompt);
      const reducedParsed = parseSummaryTakeaways(reducedContent);
      return validateSummaryTakeaways(reducedParsed, input.transcript).slice(0, 6);
    }

    // Short transcript: direct single-call
    const prompt = buildStructuredSummaryPrompt(input.title, input.transcript, lang);
    const content = await this.chatJson(prompt);
    const parsed = parseSummaryTakeaways(content);
    return validateSummaryTakeaways(parsed, input.transcript).slice(0, 6);
  }

  async generateComprehensiveAnalysis(input: {
    title: string;
    transcript: TranscriptSegment[];
  }): Promise<ComprehensiveAnalysis> {
    return generateComprehensiveInStages(input, (prompt) => this.chatJson(prompt));
  }

  async defineWords(input: { lemmas: string[] }): Promise<WordDefinition[]> {
    if (input.lemmas.length === 0) return [];

    const BATCH_SIZE = 30;
    const batches: string[][] = [];
    for (let i = 0; i < input.lemmas.length; i += BATCH_SIZE) {
      batches.push(input.lemmas.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await runConcurrent(3, batches, async (batch) => {
      const prompt = buildWordDefinitionsPrompt(batch);
      const content = await this.chatJson(prompt);
      const value = parseJsonContent(content);

      if (isRecord(value) && Array.isArray(value.definitions)) {
        return value.definitions
          .filter(isRecord)
          .map((d) => {
            const result = WordDefinitionSchema.safeParse({
              lemma: d.lemma ?? "",
              phonetic: d.phonetic,
              partOfSpeech: d.partOfSpeech,
              definitionZh: d.definitionZh ?? "",
              definitionEn: d.definitionEn,
              exampleEn: d.exampleEn,
              exampleZh: d.exampleZh,
            });
            return result.success ? result.data : null;
          })
          .filter((d): d is WordDefinition => d !== null);
      }
      return [];
    });

    return batchResults.flat();
  }

  async translateTranscript(input: { segments: TranscriptSegment[]; targetLanguage?: string }): Promise<TranscriptSegment[]> {
    if (input.segments.length === 0) return [];

    const targetLang = input.targetLanguage || "zh-CN";
    const prompt = buildTranscriptTranslationPrompt(input.segments, targetLang);
    const content = await this.chatJson(prompt);
    const parsed = parseIndexedTranslation(content, input.segments.length);

    return input.segments.map((seg, i) => ({
      ...seg,
      text_zh: parsed.get(i) ?? seg.text
    }));
  }

  private async chatJson(prompt: string): Promise<string> {
    const modelChain = [this.model, ...this.fallbackModels];
    const lastErrorMessages: string[] = [];

    for (const modelName of modelChain) {
      const result = await this.tryChat(modelName, prompt);
      if (result) return result;
      lastErrorMessages.push(`${modelName}: no response`);
    }

    console.error("[AI:Chat] 所有模型均失败! chain=%s, baseUrl=%s, errors=%s",
      modelChain.join(","), this.baseUrl, lastErrorMessages.join(" | "));
    throw new Error(`AI provider returned no response — tried ${modelChain.length} models.`);
  }

  private async tryChat(model: string, prompt: string): Promise<string | null> {
    const t0 = Date.now();
    try {
      const url = `${this.baseUrl.replace(/\/$/, "")}/v1/messages`;
      const body = {
        model,
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      };
      const data = await fetchJsonWithTimeout<Record<string, unknown>>(url, {
        method: "POST",
        timeoutMs: 180000,
        service: "AI provider (Anthropic)",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      // Anthropic response: { content: [{ type: "text", text: "..." }] }
      // Some APIs (like LongCat) return { type: "thinking" } blocks before text
      const content = data.content;
      if (Array.isArray(content)) {
        // First try: find a text block
        const textBlock = content.find((b: Record<string, unknown>) => b.type === "text");
        if (textBlock && typeof textBlock.text === "string" && textBlock.text.trim().length > 0) {
          debugLog("[AI:Chat] Anthropic API 调用成功, model=%s, 耗时 %dms, len=%d", model, Date.now() - t0, textBlock.text.length);
          debugLog("[AI:Chat] Anthropic 响应预览: %s", textBlock.text.slice(0, 500));
          return textBlock.text;
        }
        // Fallback: some APIs return thinking blocks without text — extract thinking content
        const thinkingBlocks = content.filter((b: Record<string, unknown>) => b.type === "thinking" && typeof b.thinking === "string");
        if (thinkingBlocks.length > 0) {
          const thinkingText = thinkingBlocks.map((b: Record<string, unknown>) => b.thinking as string).join("\n");
          debugLog("[AI:Chat] Anthropic API (thinking-only), model=%s, 耗时 %dms, len=%d", model, Date.now() - t0, thinkingText.length);
          debugLog("[AI:Chat] Anthropic 响应预览 (thinking): %s", thinkingText.slice(0, 500));
          return thinkingText;
        }
      }
      console.error("[AI:Chat] Anthropic 响应格式异常, model=%s, data=%s", model, JSON.stringify(data).slice(0, 300));
      return null;
    } catch (error) {
      const errStatus = error instanceof ExternalServiceError ? error.status : undefined;
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[AI:Chat] Anthropic API 调用失败, model=%s, status=%s, error=%s, 耗时 %dms",
        model, errStatus ?? "N/A", errMsg, Date.now() - t0);
      return null;
    }
  }
}

export class GeminiProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateGrammarAnalysis(input: { sentence: string }): Promise<GrammarAnalysis> {
    const content = await this.generateJson(buildGrammarAnalysisPrompt(input.sentence));
    return parseGrammarAnalysis(content, input.sentence);
  }

  async generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }) {
    const content = await this.generateJson(buildAnalysisPrompt(input.title, input.transcript));
    const value = parseJsonContent(content);
    const direct = VideoAnalysisSchema.safeParse(value);
    if (direct.success) return direct.data;
    return repairAnalysis(value, input.transcript, direct.error);
  }

  async answerQuestion(input: { question: string; transcript: TranscriptSegment[]; chunks?: RetrievedChunk[] }) {
    const prompt = input.chunks?.length
      ? buildRagChatPrompt(input.question, input.chunks)
      : buildChatPrompt(input.question, input.transcript);
    const content = await this.generateJson(prompt);
    return parseChatAnswer(content, input.transcript);
  }

  async generateKeyMoments(input: {
    title: string;
    transcript: TranscriptSegment[];
    mode: MomentsMode;
    theme?: string;
    targetLanguage?: "zh" | "en";
    debug?: GenerationDebug;
  }): Promise<KeyMoment[]> {
    const lang = input.targetLanguage ?? "zh";

    if (input.mode === "fast") {
      const chunks = chunkTranscript(input.transcript, { chunkMinutes: 5, overlapSeconds: 45 });

      const chunkResults = await runConcurrent(3, chunks, async (chunk) => {
        const prompt = buildKeyMomentsChunkPrompt(input.title, chunk.segments, lang, input.theme);
        const content = await this.generateJson(prompt);
        const candidates = parseKeyMoments(content).slice(0, 2);
        return candidates;
      });
      const allCandidates = chunkResults.flat();

      if (allCandidates.length === 0) {
        if (input.debug) fillDebug(input.debug, { model: this.model, finalCount: 0 });
        return [];
      }

      const reducePrompt = buildKeyMomentsReducePrompt(input.title, allCandidates, input.transcript, lang);
      const reduceContent = await this.generateJson(reducePrompt);
      const final = parseKeyMoments(reduceContent);
      const validated = validateAndDedupMoments(final, input.transcript).slice(0, 5);
      if (input.debug) {
        fillDebug(input.debug, {
          model: this.model,
          promptLength: reducePrompt.length,
          rawResponseLength: reduceContent.length,
          rawResponsePreview: reduceContent.slice(0, 300),
          parseCount: final.length,
          validateCount: validated.length,
          finalCount: validated.length
        });
      }
      return validated;
    }

    const prompt = buildKeyMomentsPrompt(input.title, input.transcript, lang, input.theme);
    const content = await this.generateJson(prompt);
    const moments = parseKeyMoments(content);
    const validated = validateAndDedupMoments(moments, input.transcript).slice(0, 5);
    if (input.debug) {
      fillDebug(input.debug, {
        model: this.model,
        promptLength: prompt.length,
        rawResponseLength: content.length,
        rawResponsePreview: content.slice(0, 300),
        parseCount: moments.length,
        validateCount: validated.length,
        finalCount: validated.length
      });
    }
    return validated;
  }

  async generateStructuredSummary(input: {
    title: string;
    transcript: TranscriptSegment[];
    targetLanguage?: "zh" | "en";
    debug?: GenerationDebug;
  }): Promise<SummaryTakeaway[]> {
    const lang = input.targetLanguage ?? "zh";
    const prompt = buildStructuredSummaryPrompt(input.title, input.transcript, lang);
    const content = await this.generateJson(prompt);
    const takeaways = parseSummaryTakeaways(content);
    const validated = validateSummaryTakeaways(takeaways, input.transcript);
    if (input.debug) {
      fillDebug(input.debug, {
        model: this.model,
        promptLength: prompt.length,
        rawResponseLength: content.length,
        rawResponsePreview: content.slice(0, 300),
        parseCount: takeaways.length,
        validateCount: validated.length,
        finalCount: validated.length
      });
    }
    return validated;
  }

  async generateComprehensiveAnalysis(input: {
    title: string;
    transcript: TranscriptSegment[];
  }): Promise<ComprehensiveAnalysis> {
    return generateComprehensiveInStages(input, (prompt) => this.generateJson(prompt));
  }

  async defineWords(input: { lemmas: string[] }): Promise<WordDefinition[]> {
    if (input.lemmas.length === 0) return [];

    const BATCH_SIZE = 30;
    const batches: string[][] = [];
    for (let i = 0; i < input.lemmas.length; i += BATCH_SIZE) {
      batches.push(input.lemmas.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await runConcurrent(3, batches, async (batch) => {
      const prompt = buildWordDefinitionsPrompt(batch);
      const content = await this.generateJson(prompt);
      const value = parseJsonContent(content);

      if (isRecord(value) && Array.isArray(value.definitions)) {
        return value.definitions
          .filter(isRecord)
          .map((d) => {
            const result = WordDefinitionSchema.safeParse({
              lemma: d.lemma ?? "",
              phonetic: d.phonetic,
              partOfSpeech: d.partOfSpeech,
              definitionZh: d.definitionZh ?? "",
              definitionEn: d.definitionEn,
              exampleEn: d.exampleEn,
              exampleZh: d.exampleZh,
            });
            return result.success ? result.data : null;
          })
          .filter((d): d is WordDefinition => d !== null);
      }
      return [];
    });

    return batchResults.flat();
  }

  async translateTranscript(input: { segments: TranscriptSegment[]; targetLanguage?: string }): Promise<TranscriptSegment[]> {
    if (input.segments.length === 0) return [];

    const targetLang = input.targetLanguage || "zh-CN";
    const prompt = buildTranscriptTranslationPrompt(input.segments, targetLang);
    const content = await this.generateTranslation(prompt);
    const parsed = parseIndexedTranslation(content, input.segments.length);

    return input.segments.map((seg, i) => ({
      ...seg,
      text_zh: parsed.get(i) ?? seg.text
    }));
  }

  /** Gemini 翻译（不用 JSON mode） */
  private async generateTranslation(prompt: string): Promise<string> {
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
          contents: [{ parts: [{ text: prompt }] }]
        })
      })
    );

    return response.candidates[0]?.content.parts.map((part) => part.text ?? "").join("") ?? "";
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

// ── 数据库配置缓存 ──

let cachedDbConfig: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

// Per-user 配置缓存
const userConfigCache = new Map<string, { config: Record<string, string>; ts: number }>();

async function loadDbConfig(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedDbConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedDbConfig;
  }

  try {
    // 动态导入避免在非请求上下文（构建时）触发 cookies() 调用
    const { getAppSettings } = await import("@/lib/supabase/admin");
    cachedDbConfig = await getAppSettings();
    cacheTimestamp = now;
  } catch {
    // 数据库不可用时回退到空配置
    cachedDbConfig = {};
    cacheTimestamp = now;
  }

  return cachedDbConfig;
}

async function loadUserConfig(userId: string): Promise<Record<string, string>> {
  const cached = userConfigCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.config;
  }

  try {
    const { getUserAiSettings } = await import("@/lib/supabase/admin");
    const config = await getUserAiSettings(userId);
    userConfigCache.set(userId, { config, ts: Date.now() });
    return config;
  } catch {
    userConfigCache.set(userId, { config: {}, ts: Date.now() });
    return {};
  }
}

/** 清除数据库配置缓存，下次 AiProvider 调用时重新加载。 */
export function clearAiProviderCache() {
  cachedDbConfig = null;
  cacheTimestamp = 0;
  userConfigCache.clear();
}

export type AiConfig = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type AiConfigSource = "environment" | "user" | "database" | "default" | "unset";

export type AiConfigResolution = {
  config: AiConfig;
  sources: {
    provider: AiConfigSource;
    apiKey: AiConfigSource;
    baseUrl: AiConfigSource;
    model: AiConfigSource;
  };
  envOverrides: {
    provider: boolean;
    apiKey: boolean;
    baseUrl: boolean;
    model: boolean;
  };
};

async function resolveAiConfig(userId?: string): Promise<AiConfigResolution> {
  const envProvider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const envApiKey = (process.env.AI_API_KEY ?? "").trim();
  const envBaseUrl = (process.env.AI_API_BASE_URL ?? "").trim();
  const envModel = (process.env.AI_MODEL ?? "").trim();

  const [db, user] = await Promise.all([
    loadDbConfig(),
    userId ? loadUserConfig(userId) : Promise.resolve({} as Record<string, string>),
  ]);

  function resolveValue(
    environmentValue: string,
    userValue: string | undefined,
    databaseValue: string | undefined,
    fallback: string | undefined,
  ): { value: string; source: AiConfigSource } {
    if (environmentValue) return { value: environmentValue, source: "environment" };
    if (userValue?.trim()) return { value: userValue.trim(), source: "user" };
    if (databaseValue?.trim()) return { value: databaseValue.trim(), source: "database" };
    if (fallback !== undefined) return { value: fallback, source: "default" };
    return { value: "", source: "unset" };
  }

  // 优先级: 环境变量 > 用户个人配置 > 全局 app_settings > 默认值
  const provider = resolveValue(envProvider, user?.ai_provider, db.ai_provider, undefined);
  provider.value = provider.value.toLowerCase();
  const apiKey = resolveValue(envApiKey, user?.ai_api_key, db.ai_api_key, undefined);
  const baseUrl = resolveValue(
    envBaseUrl,
    user?.ai_api_base_url,
    db.ai_api_base_url,
    "https://api.openai.com/v1",
  );
  const model = resolveValue(envModel, user?.ai_model, db.ai_model, "deepseek-v4-flash");

  return {
    config: {
      provider: provider.value,
      apiKey: apiKey.value,
      baseUrl: baseUrl.value,
      model: model.value,
    },
    sources: {
      provider: provider.source,
      apiKey: apiKey.source,
      baseUrl: baseUrl.source,
      model: model.source,
    },
    envOverrides: {
      provider: provider.source === "environment",
      apiKey: apiKey.source === "environment",
      baseUrl: baseUrl.source === "environment",
      model: model.source === "environment",
    },
  };
}

async function getResolvedConfig(userId?: string): Promise<AiConfig> {
  return (await resolveAiConfig(userId)).config;
}

/** Return the global runtime configuration for admin diagnostics without exposing the key. */
export async function getEffectiveAiConfigResolution(): Promise<AiConfigResolution> {
  return resolveAiConfig();
}

function createProviderFromConfig(
  config: AiConfig,
  options: ConstructorParameters<typeof OpenAiCompatibleProvider>[4] = {},
): AiProvider {
  if (!config.apiKey) {
    throw new Error(
      "AI_API_KEY 未配置。请在环境变量或管理后台设置 API Key。",
    );
  }

  if (config.provider === "openai-compatible" || config.provider === "deepseek" || config.provider === "glm" || config.provider === "qwen") {
    const chain = getModelFallbackChain(config.model || "deepseek-v4-flash");
    return new OpenAiCompatibleProvider(
      config.apiKey,
      normalizeOpenAiCompatibleBaseUrl(config.baseUrl),
      chain[0],
      chain.slice(1),
      options,
    );
  }

  if (config.provider === "gemini") {
    return new GeminiProvider(
      config.apiKey,
      config.model || "gemini-1.5-flash",
    );
  }

  if (config.provider === "anthropic") {
    const chain = getModelFallbackChain(config.model || "claude-3-5-sonnet-20241022");
    return new AnthropicProvider(
      config.apiKey,
      config.baseUrl || "https://api.anthropic.com",
      chain[0],
      chain.slice(1),
    );
  }

  throw new Error(
    `AI_PROVIDER "${config.provider || "(not set)"}" is invalid. Set to "openai-compatible", "deepseek", "glm", "qwen", "gemini", or "anthropic".`,
  );
}

function getFallbackEnvironmentConfig(): AiConfig | null {
  const apiKey = (process.env.AI_FALLBACK_API_KEY ?? "").trim();
  if (!apiKey) return null;

  return {
    provider: (process.env.AI_FALLBACK_PROVIDER ?? "openai-compatible").trim().toLowerCase(),
    apiKey,
    baseUrl: (process.env.AI_FALLBACK_API_BASE_URL ?? "https://api.openai.com/v1").trim(),
    model: (process.env.AI_FALLBACK_MODEL ?? "gpt-4o-mini").trim(),
  };
}

function getFallbackProviderOptions(): ConstructorParameters<typeof OpenAiCompatibleProvider>[4] {
  const readPositiveInteger = (name: string, fallback: number) => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  };

  return {
    requestTimeoutMs: readPositiveInteger("AI_FALLBACK_TIMEOUT_MS", 8_000),
    translationTimeoutMs: readPositiveInteger("AI_FALLBACK_TRANSLATION_TIMEOUT_MS", 12_000),
    maxAttempts: readPositiveInteger("AI_FALLBACK_MAX_ATTEMPTS", 1),
  };
}

export async function getAiProvider(userId?: string): Promise<AiProvider> {
  const config = await getResolvedConfig(userId);
  const fallbackConfig = getFallbackEnvironmentConfig();
  let primary: AiProvider;
  try {
    primary = createProviderFromConfig(config);
  } catch (primaryError) {
    if (!fallbackConfig) throw primaryError;
    console.warn(
      "[AI:Fallback] 主模型配置不可用，直接使用备用模型: %s",
      primaryError instanceof Error ? primaryError.message : "unknown error",
    );
    return createProviderFromConfig(fallbackConfig, getFallbackProviderOptions());
  }
  if (!fallbackConfig) return primary;

  try {
    return new FallbackAiProvider(primary, createProviderFromConfig(fallbackConfig, getFallbackProviderOptions()));
  } catch (error) {
    console.warn(
      "[AI:Fallback] 备用模型配置无效，继续使用主模型: %s",
      error instanceof Error ? error.message : "unknown error",
    );
    return primary;
  }
}

function fillDebug(debug: GenerationDebug, data: Partial<GenerationDebug>) {
  debug.model = data.model ?? "unknown";
  debug.promptLength = data.promptLength ?? 0;
  debug.rawResponseLength = data.rawResponseLength ?? 0;
  debug.rawResponsePreview = data.rawResponsePreview ?? "";
  debug.parseCount = data.parseCount ?? 0;
  debug.validateCount = data.validateCount ?? 0;
  debug.finalCount = data.finalCount ?? 0;
}

export function parseJsonContentWithDiagnostics(content: string): { value: unknown; mode: JsonParseMode } {
  // 先尝试直接解析
  try {
    return { value: JSON.parse(content) as unknown, mode: "direct" };
  } catch {
    // 继续
  }

  // 括号计数法提取 —— 比贪心正则更可靠，正确处理嵌套和字符串
  const extracted = extractBalancedJson(content);
  if (extracted) {
    try {
      return { value: JSON.parse(extracted) as unknown, mode: "extracted" };
    } catch {
      // 继续尝试修复
    }

    // JSON 解析失败时尝试修复常见问题：尾部逗号、单引号等
    const repaired = repairBrokenJson(extracted);
    if (repaired) {
      try {
        return { value: JSON.parse(repaired) as unknown, mode: "repaired" };
      } catch {
        // 最终失败
      }
    }
  }

  // 从 thinking 文本中智能提取 JSON（处理 LongCat 等 API 返回 thinking 块的情况）
  const thinkingJson = extractJsonFromThinking(content);
  if (thinkingJson) {
    debugLog("[JSON] extractJsonFromThinking 提取成功, 长度: %d", thinkingJson.length);
    try {
      return { value: JSON.parse(thinkingJson) as unknown, mode: "thinking" };
    } catch {
      // 继续尝试修复
    }
    const repairedThinking = repairBrokenJson(thinkingJson);
    if (repairedThinking) {
      try {
        return { value: JSON.parse(repairedThinking) as unknown, mode: "thinking_repaired" };
      } catch {
        // 最终失败
      }
    }
  } else {
    debugLog("[JSON] extractJsonFromThinking 未提取到 JSON, 内容预览: %s", content.slice(0, 200));
  }

  throw new Error("AI provider did not return valid JSON.");
}

function parseJsonContent(content: string) {
  return parseJsonContentWithDiagnostics(content).value;
}

const GRAMMAR_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#B76CFD", "#FF6B6B"];

function parseGrammarAnalysis(content: string, sentence: string): GrammarAnalysis {
  const parsed = parseJsonContent(content);
  const direct = GrammarAnalysisSchema.safeParse(parsed);
  if (direct.success) return direct.data;
  if (!isRecord(parsed)) throw direct.error;

  const rawTags = Array.isArray(parsed.posTags) ? parsed.posTags : [];
  const fallbackWords = sentence.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g) ?? [sentence];
  const posTags = rawTags
    .map((tag, index) => {
      if (!isRecord(tag)) return null;
      const word = getString(tag, ["word", "text", "token"])?.trim() || fallbackWords[index] || "";
      const pos = getString(tag, ["pos", "partOfSpeech", "tag"])?.trim() || "word";
      return word ? { word, pos, color: GRAMMAR_COLORS[index % GRAMMAR_COLORS.length] } : null;
    })
    .filter((tag): tag is { word: string; pos: string; color: string } => tag !== null);

  const repaired = GrammarAnalysisSchema.safeParse({
    sentence: getString(parsed, ["sentence", "original", "text"])?.trim() || sentence,
    translation: getString(parsed, ["translation", "translationZh", "meaning"])?.trim() || "暂时无法生成翻译。",
    posTags: posTags.length > 0
      ? posTags
      : fallbackWords.map((word, index) => ({ word, pos: "word", color: GRAMMAR_COLORS[index % GRAMMAR_COLORS.length] })),
    structure: getString(parsed, ["structure", "syntax", "pattern"])?.trim() || "句子结构解析暂不可用。",
    explanation: getString(parsed, ["explanation", "analysis", "detail"])?.trim() || "暂时无法生成详细语法说明。",
  });
  if (repaired.success) return repaired.data;
  throw direct.error;
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
    suggestedQuestions: suggestedQuestions.length >= 3 ? suggestedQuestions : generateDefaultQuestions(),
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

  return raw.filter(isRecord).map((h) => {
    const startTime = getNumber(h, ["startTime", "start", "start_time", "startSeconds"]) ?? 0;
    const endTime = getNumber(h, ["endTime", "end", "end_time", "endSeconds"]) ?? (startTime + 10);
    const title = getString(h, ["title", "heading", "name"])?.trim() || "要点时刻";
    const quote = getString(h, ["quote", "text", "excerpt", "evidence"])?.trim() || "精彩引言";
    const reason = getString(h, ["reason", "explanation", "description", "note"])?.trim() || "深入剖析核心内容";
    return { startTime, endTime, title, quote, reason };
  });
}

function generateDefaultTakeaways(transcript: TranscriptSegment[]): string[] {
  if (transcript.length === 0) {
    return [
      "无法生成要点：字幕为空",
      "请检查视频是否有有效的语言轨道",
      "您可以尝试重新导入视频或检查网络"
    ];
  }
  const mid = Math.floor(transcript.length / 2);
  return [
    transcript.slice(0, 10).map((s) => s.text).join(" ").slice(0, 200) || "视频开始段落内容摘要",
    transcript.slice(mid, mid + 10).map((s) => s.text).join(" ").slice(0, 200) || "视频中间段落内容摘要",
    transcript.slice(-10).map((s) => s.text).join(" ").slice(0, 200) || "视频结尾段落内容摘要"
  ];
}

function generateDefaultQuestions(): string[] {
  return [
    "视频的主要内容是什么？",
    "有哪些关键观点或发现？",
    "作者得出了什么结论？"
  ];
}

function generateDefaultHighlights(transcript: TranscriptSegment[]): Array<Record<string, unknown>> {
  const highlights: Array<Record<string, unknown>> = [];
  const count = 5;
  if (transcript.length === 0) {
    for (let i = 0; i < count; i++) {
      highlights.push({
        startTime: i * 10,
        endTime: (i + 1) * 10,
        title: `要点时刻 ${i + 1}`,
        quote: "精彩视频片段引言",
        reason: "从字幕中自动提取关键要点"
      });
    }
    return highlights;
  }

  const step = Math.max(1, Math.floor(transcript.length / count));
  for (let i = 0; i < count; i++) {
    const idx = Math.min(i * step, transcript.length - 1);
    const seg = transcript[idx];
    highlights.push({
      startTime: seg.startTime,
      endTime: Math.max(seg.endTime, seg.startTime + 10),
      title: `精彩看点 ${i + 1}`,
      quote: seg.text.slice(0, 220) || "精彩画面或重点描述",
      reason: "自动提取的核心讨论和背景"
    });
  }
  return highlights;
}

function parseChatAnswer(content: string, transcript: TranscriptSegment[]): ChatAnswerWithDiagnostics {
  const parsed = parseJsonContentWithDiagnostics(content);
  const value = parsed.value;
  const direct = ChatAnswerSchema.safeParse(value);
  if (direct.success) {
    return {
      ...direct.data,
      diagnostics: { jsonParseMode: parsed.mode, citationNormalized: false },
    };
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

  return {
    ...ChatAnswerSchema.parse({ answer, citations: citations.slice(0, 5) }),
    diagnostics: { jsonParseMode: parsed.mode, citationNormalized: true },
  };
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

/** 限制并发数的并行执行器，保持结果顺序 */
async function runConcurrent<T, R>(
  concurrency: number,
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

const COMPREHENSIVE_CHUNK_THRESHOLD = 220;
const COMPREHENSIVE_CONCURRENCY = 1;

async function generateComprehensiveInStages(
  input: { title: string; transcript: TranscriptSegment[] },
  generateJson: (prompt: string) => Promise<string>,
): Promise<ComprehensiveAnalysis> {
  if (input.transcript.length <= COMPREHENSIVE_CHUNK_THRESHOLD) {
    const prompt = buildComprehensivePrompt(input.title, input.transcript);
    debugLog("[AI:Comprehensive] single-pass prompt length: %d", prompt.length);
    return generateComprehensiveWithRetry(() => generateJson(prompt), input.title, input.transcript);
  }

  const chunks = chunkTranscript(input.transcript, {
    chunkMinutes: 8,
    overlapSeconds: 30,
  });
  debugLog("[AI:Comprehensive] staged mode: %d chunks, concurrency=%d", chunks.length, COMPREHENSIVE_CONCURRENCY);

  const notes = await runConcurrent(COMPREHENSIVE_CONCURRENCY, chunks, async (chunk) => {
    const prompt = buildComprehensiveChunkPrompt(input.title, chunk.segments);
    return generateJson(prompt);
  });
  const reducePrompt = buildComprehensiveReducePrompt(input.title, notes);
  debugLog("[AI:Comprehensive] reduce prompt length: %d", reducePrompt.length);
  return generateComprehensiveWithRetry(() => generateJson(reducePrompt), input.title, input.transcript);
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

/** 判断 comprehensive 结果是否实际为空（缺 summary 且缺 takeaways/moments） */
function isEmptyComprehensive(c: ComprehensiveAnalysis): boolean {
  return c.summary.trim().length < 10 && c.takeaways.length === 0 && c.moments.length === 0;
}

/** 解析并校验 comprehensive 内容：直解失败则走 repair，都失败返回 null（不抛异常） */
function parseComprehensiveResult(content: string): ComprehensiveAnalysis | null {
  let value: unknown;
  try {
    value = parseJsonContent(content);
  } catch {
    return null;
  }
  const direct = ComprehensiveAnalysisSchema.safeParse(value);
  if (direct.success) return direct.data;
  const repaired = ComprehensiveAnalysisSchema.safeParse(repairComprehensive(value));
  return repaired.success ? repaired.data : null;
}

/**
 * 统一的 comprehensive 生成逻辑，带空结果重试。
 * LongCat-2.0 等模型偶发只返回 thinking 块、缺最终 JSON，解析出的对象虽能通过 schema
 * 但字段全空。此时重试一次（新的一次请求几乎总能拿到正常的 text 块），仍空才回退。
 */
async function generateComprehensiveWithRetry(
  fetchContent: () => Promise<string>,
  title: string,
  transcript: TranscriptSegment[]
): Promise<ComprehensiveAnalysis> {
  const t0 = Date.now();
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const content = await fetchContent();
    debugLog("[AI:Comprehensive] AI 原始响应长度: %d 字符 (第 %d 次)", content.length, attempt);
    const parsed = parseComprehensiveResult(content);
    if (parsed && !isEmptyComprehensive(parsed)) {
      debugLog("[AI:Comprehensive] 解析成功, takeaways=%d, moments=%d, highlights=%d, 耗时 %dms",
        parsed.takeaways.length, parsed.moments.length, parsed.highlights.length, Date.now() - t0);
      return parsed;
    }
    debugLog("[AI:Comprehensive] 第 %d 次结果为空, %s", attempt, attempt < maxAttempts ? "重试" : "使用 fallback");
  }
  return buildFallbackComprehensive(title, transcript);
}

function repairComprehensive(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};

  const summary = getString(value, ["summary", "description", "overview"]) ?? "";
  const rawTakeaways = Array.isArray(value.takeaways) ? value.takeaways : [];
  const takeaways = rawTakeaways.filter(isRecord).map((t) => ({
    label: getString(t, ["label"]) ?? "",
    label_zh: getString(t, ["label_zh"]) ?? getString(t, ["label"]) ?? "",
    insight: getString(t, ["insight"]) ?? "",
    insight_zh: getString(t, ["insight_zh"]) ?? getString(t, ["insight"]) ?? "",
    timestamps: Array.isArray(t.timestamps) ? t.timestamps.filter((x): x is string => typeof x === "string") : [],
  }));
  const rawMoments = Array.isArray(value.moments) ? value.moments : [];
  const moments = rawMoments.filter(isRecord).map((m) => ({
    title: getString(m, ["title"]) ?? "",
    title_zh: getString(m, ["title_zh"]) ?? getString(m, ["title"]) ?? "",
    timestamp: getString(m, ["timestamp"]) ?? "",
    quote: getString(m, ["quote"]) ?? "",
    quote_zh: getString(m, ["quote_zh"]) ?? getString(m, ["quote"]) ?? "",
    reason: getString(m, ["reason"]) ?? "",
    reason_zh: getString(m, ["reason_zh"]) ?? getString(m, ["reason"]) ?? "",
  }));
  const rawHighlights = Array.isArray(value.highlights) ? value.highlights : [];
  const highlights = rawHighlights.filter(isRecord).map((h) => ({
    startTime: getNumber(h, ["startTime", "start"]) ?? 0,
    endTime: getNumber(h, ["endTime", "end"]) ?? (getNumber(h, ["startTime", "start"]) ?? 0) + 10,
    title: getString(h, ["title"]) ?? "",
    quote: getString(h, ["quote"]) ?? "",
    reason: getString(h, ["reason"]) ?? "",
  }));
  const rawQuestions = Array.isArray(value.suggestedQuestions) ? value.suggestedQuestions : [];
  const suggestedQuestions = rawQuestions.filter((q): q is string => typeof q === "string");

  return { summary, takeaways, moments, highlights, suggestedQuestions };
}

function buildFallbackComprehensive(
  title: string,
  transcript: TranscriptSegment[]
): ComprehensiveAnalysis {
  return {
    summary: `Video analysis for "${title}". AI comprehensive generation failed; falling back to basic summary.`,
    takeaways: [],
    moments: [],
    highlights: generateDefaultHighlights(transcript).map((h) => ({
      startTime: h.startTime as number,
      endTime: h.endTime as number,
      title: h.title as string,
      quote: h.quote as string,
      reason: h.reason as string,
    })),
    suggestedQuestions: ["What is the main topic of this video?", "What are the key points discussed?"],
  };
}
