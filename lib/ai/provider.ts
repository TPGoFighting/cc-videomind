import { z } from "zod";
import {
  ChatAnswerSchema,
  CitationSchema,
  VideoAnalysisSchema,
  type ChatAnswer,
  type TranscriptSegment,
  type VideoAnalysis
} from "@/lib/types";
import { buildAnalysisPrompt, buildChatPrompt } from "@/lib/ai/prompts";
import { fetchJsonWithTimeout } from "@/lib/utils/http";

export interface AiProvider {
  generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }): Promise<VideoAnalysis>;
  answerQuestion(input: { question: string; transcript: TranscriptSegment[] }): Promise<ChatAnswer>;
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
    private readonly apiKey = requiredEnv("AI_API_KEY"),
    private readonly baseUrl = normalizeOpenAiCompatibleBaseUrl(
      process.env.AI_API_BASE_URL ?? "https://api.openai.com/v1"
    ),
    private readonly model = process.env.AI_MODEL ?? "gpt-4o-mini"
  ) {}

  async generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }) {
    const content = await this.chatJson(buildAnalysisPrompt(input.title, input.transcript));
    return VideoAnalysisSchema.parse(parseJsonContent(content));
  }

  async answerQuestion(input: { question: string; transcript: TranscriptSegment[] }) {
    const content = await this.chatJson(buildChatPrompt(input.question, input.transcript));
    return parseChatAnswer(content, input.transcript);
  }

  private async chatJson(prompt: string) {
    const response = OpenAiChatResponseSchema.parse(
      await fetchJsonWithTimeout<unknown>(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        timeoutMs: 30000,
        service: "AI provider",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Return only valid JSON. Ground every output in the provided transcript." },
            { role: "user", content: prompt }
          ]
        })
      })
    );

    return response.choices[0]?.message.content ?? "{}";
  }
}

export class GeminiProvider implements AiProvider {
  constructor(
    private readonly apiKey = requiredEnv("GEMINI_API_KEY"),
    private readonly model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash"
  ) {}

  async generateAnalysis(input: { title: string; transcript: TranscriptSegment[] }) {
    const content = await this.generateJson(buildAnalysisPrompt(input.title, input.transcript));
    return VideoAnalysisSchema.parse(parseJsonContent(content));
  }

  async answerQuestion(input: { question: string; transcript: TranscriptSegment[] }) {
    const content = await this.generateJson(buildChatPrompt(input.question, input.transcript));
    return parseChatAnswer(content, input.transcript);
  }

  private async generateJson(prompt: string) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const response = GeminiResponseSchema.parse(
      await fetchJsonWithTimeout<unknown>(endpoint, {
        method: "POST",
        timeoutMs: 30000,
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
  try {
    return JSON.parse(content) as unknown;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI provider did not return JSON.");
    }
    return JSON.parse(match[0]) as unknown;
  }
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
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
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
