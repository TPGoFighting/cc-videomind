import { z } from "zod";
import {
  ChatAnswerSchema,
  CitationSchema,
  VideoAnalysisSchema,
  WordDefinitionSchema,
  type ChatAnswer,
  type GenerationDebug,
  type KeyMoment,
  type MomentsMode,
  type SummaryTakeaway,
  type TranscriptSegment,
  type VideoAnalysis,
  type WordDefinition
} from "@/lib/types";
import { buildAnalysisPrompt, buildChatPrompt } from "@/lib/ai/prompts";
import {
  buildKeyMomentsPrompt,
  buildKeyMomentsChunkPrompt,
  buildKeyMomentsReducePrompt,
  buildStructuredSummaryPrompt
} from "@/lib/ai/prompts-v2";
import {
  buildWordDefinitionsPrompt,
  buildTranscriptTranslationPrompt,
  parseIndexedTranslation
} from "@/lib/ai/prompts-learn";
import { fetchJsonWithTimeout, ExternalServiceError } from "@/lib/utils/http";
import { chunkTranscript } from "@/lib/utils/chunk";
import { extractBalancedJson, repairBrokenJson } from "@/lib/utils/json";
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

export interface AiProvider {
  generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }): Promise<VideoAnalysis>;
  answerQuestion(input: { question: string; transcript: TranscriptSegment[] }): Promise<ChatAnswer>;
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

  /** 批量生成词义定义 */
  defineWords(input: { lemmas: string[] }): Promise<WordDefinition[]>;

  /** 翻译转录文本为中文或英文 */
  translateTranscript(input: { segments: TranscriptSegment[]; targetLanguage?: string }): Promise<TranscriptSegment[]>;
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
  private readonly modelChain: string[];

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    primaryModel: string,
    fallbackModels?: string[],
  ) {
    this.model = primaryModel;
    this.modelChain = [primaryModel, ...(fallbackModels ?? []).filter(m => m !== primaryModel)];
  }

  private model: string;

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
      ]
    };

    // 直接调 tryChat，不强制 JSON mode
    const content = await this.tryChat(body);
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

      // 先尝试带 response_format
      const withFormat = await this.tryChat({ ...body, response_format: { type: "json_object" as const } });
      if (withFormat) {
        if (modelName !== this.model) debugLog("[AI:Fallback] 切换到 %s 成功", modelName);
        debugLog("[AI:Chat] model=%s, 耗时 %dms, 响应长度 %d", modelName, Date.now() - t0, withFormat.length);
        return withFormat;
      }

      // 不带 response_format 再试
      const withoutFormat = await this.tryChat(body);
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
      debugLog("[AI:Chat] API 调用成功, model=%s, 耗时 %dms", model, Date.now() - t0);
      return response.choices[0]?.message.content ?? null;
    } catch (error) {
      const errStatus = error instanceof ExternalServiceError ? error.status : undefined;
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[AI:Chat] API 调用失败, model=%s, status=%s, error=%s, 耗时 %dms",
        model, errStatus ?? "N/A", errMsg, Date.now() - t0);
      return null;
    }
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
    const prompt = buildStructuredSummaryPrompt(input.title, input.transcript, lang);
    const content = await this.chatJson(prompt);
    const parsed = parseSummaryTakeaways(content);
    return validateSummaryTakeaways(parsed, input.transcript).slice(0, 6);
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
        max_tokens: 4096,
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

async function getResolvedConfig(userId?: string): Promise<AiConfig> {
  const envProvider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const envApiKey = (process.env.AI_API_KEY ?? "").trim();
  const envBaseUrl = (process.env.AI_API_BASE_URL ?? "https://api.openai.com/v1").trim();
  const envModel = (process.env.AI_MODEL ?? "deepseek-v4-flash").trim();

  const [db, user] = await Promise.all([
    loadDbConfig(),
    userId ? loadUserConfig(userId) : Promise.resolve({} as Record<string, string>),
  ]);

  // 优先级: 环境变量 > 用户个人配置 > 全局 app_settings
  return {
    provider: (envProvider || user.ai_provider || db.ai_provider),
    apiKey: (envApiKey || user.ai_api_key || db.ai_api_key),
    baseUrl: (envBaseUrl || user.ai_api_base_url || db.ai_api_base_url),
    model: (envModel || user.ai_model || db.ai_model),
  };
}

export async function getAiProvider(userId?: string): Promise<AiProvider> {
  const config = await getResolvedConfig(userId);

  if (!config.apiKey) {
    throw new Error(
      "AI_API_KEY 未配置。请在环境变量或管理后台设置 API Key。",
    );
  }

  if (config.provider === "openai-compatible" || config.provider === "deepseek") {
    const { getModelFallbackChain } = await import("@/lib/ai/provider-registry");
    const chain = getModelFallbackChain(config.model || "deepseek-v4-flash");
    return new OpenAiCompatibleProvider(
      config.apiKey,
      normalizeOpenAiCompatibleBaseUrl(config.baseUrl),
      chain[0],
      chain.slice(1),
    );
  }

  if (config.provider === "gemini") {
    return new GeminiProvider(
      config.apiKey,
      config.model || "gemini-1.5-flash",
    );
  }

  if (config.provider === "anthropic") {
    const { getModelFallbackChain } = await import("@/lib/ai/provider-registry");
    const chain = getModelFallbackChain(config.model || "claude-3-5-sonnet-20241022");
    return new AnthropicProvider(
      config.apiKey,
      config.baseUrl || "https://api.anthropic.com",
      chain[0],
      chain.slice(1),
    );
  }

  throw new Error(
    `AI_PROVIDER "${config.provider || "(not set)"}" is invalid. Set to "openai-compatible", "deepseek", "gemini", or "anthropic".`,
  );
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

function generateDefaultQuestions(transcript: TranscriptSegment[]): string[] {
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
