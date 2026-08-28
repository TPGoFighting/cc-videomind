import { z } from "zod";

export type JsonResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

export const TranscriptSegmentSchema = z.object({ startTime: z.number().nonnegative(), endTime: z.number().positive(), text: z.string().min(1), text_zh: z.string().optional() });
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const VideoMetadataSchema = z.object({
  videoId: z.string().min(1), title: z.string().min(1), authorName: z.string().optional(),
  channelThumbnailUrl: z.string().optional(), thumbnailUrl: z.string().optional(),
  durationSeconds: z.number().nonnegative().optional(), providerUrl: z.string().optional(),
});
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

export const CitationSchema = z.object({ startTime: z.number().nonnegative(), endTime: z.number().positive(), quote: z.string().min(1) });
export const VideoAnalysisSchema = z.object({
  summary: z.string().min(1), takeaways: z.array(z.string()).default([]), suggestedQuestions: z.array(z.string()).default([]),
  highlights: z.array(z.object({ startTime: z.number().nonnegative(), endTime: z.number().positive(), title: z.string(), quote: z.string(), reason: z.string() })).default([]),
});
export type VideoAnalysis = z.infer<typeof VideoAnalysisSchema>;
export const VideoAnalysisPayloadSchema = z.object({
  videoId: z.string().min(1), metadata: VideoMetadataSchema.nullable().optional(), transcript: z.array(TranscriptSegmentSchema).default([]), analysis: VideoAnalysisSchema, cached: z.boolean().optional(),
});
export type VideoAnalysisPayload = z.infer<typeof VideoAnalysisPayloadSchema>;

export const KeyMomentSchema = z.object({ title: z.string().min(1), title_zh: z.string().optional(), timestamp: z.string().min(1), quote: z.string().optional().default(""), quote_zh: z.string().optional(), reason: z.string().min(1), reason_zh: z.string().optional() });
export type KeyMoment = z.infer<typeof KeyMomentSchema>;
export const SummaryTakeawaySchema = z.object({ label: z.string().min(1), label_zh: z.string().optional(), insight: z.string().min(1), insight_zh: z.string().optional(), timestamps: z.array(z.string()).default([]) });
export type SummaryTakeaway = z.infer<typeof SummaryTakeawaySchema>;
export const MomentsPayloadSchema = z.object({ moments: z.array(KeyMomentSchema).default([]) });
export type MomentsPayload = z.infer<typeof MomentsPayloadSchema>;
export const SummaryPayloadSchema = z.object({ takeaways: z.array(SummaryTakeawaySchema).default([]) });
export type SummaryPayload = z.infer<typeof SummaryPayloadSchema>;
export const ChatAnswerSchema = z.object({ answer: z.string().min(1), citations: z.array(CitationSchema).default([]) });
export type ChatAnswer = z.infer<typeof ChatAnswerSchema>;

export const HistoryItemSchema = z.object({ videoId: z.string(), title: z.string().optional(), channelName: z.string().optional(), thumbnail: z.string().optional(), thumbnailUrl: z.string().optional(), parsedAt: z.string(), viewedAt: z.string().optional() });
export type HistoryItem = z.infer<typeof HistoryItemSchema>;
export const VocabItemSchema = z.object({ id: z.string(), lemma: z.string(), phonetic: z.string().nullable().optional(), partOfSpeech: z.string().nullable().optional(), definitionZh: z.string(), definitionEn: z.string().nullable().optional(), exampleEn: z.string().nullable().optional(), exampleZh: z.string().nullable().optional(), createdAt: z.string() });
export type VocabItem = z.infer<typeof VocabItemSchema>;
export const VocabListSchema = z.object({ vocabulary: z.array(VocabItemSchema).default([]) });
export const SaveWordResponseSchema = z.object({ ok: z.boolean().default(true) }).passthrough();
export type SaveWordResponse = z.infer<typeof SaveWordResponseSchema>;
export const QuoteItemSchema = z.object({ id: z.string(), videoId: z.string(), videoTitle: z.string().nullable().optional(), textEn: z.string(), textZh: z.string().nullable().optional(), startTime: z.number(), endTime: z.number(), notes: z.string().nullable().optional(), createdAt: z.string() });
export type QuoteItem = z.infer<typeof QuoteItemSchema>;
export const QuoteListSchema = z.object({ quotes: z.array(QuoteItemSchema).default([]) });
export const SaveQuoteRequestSchema = z.object({ videoId: z.string().min(1), textEn: z.string().min(1), textZh: z.string().optional(), startTime: z.number().nonnegative(), endTime: z.number().positive(), notes: z.string().optional() });

const ReviewItemSchema = z.object({ lemma: z.string(), phonetic: z.string().nullable().optional(), definitionZh: z.string(), dueAt: z.string().optional() });
export const ReviewListSchema = z.object({ reviews: z.array(ReviewItemSchema).default([]) });
export type ReviewList = z.infer<typeof ReviewListSchema>;
export const SubmitReviewSchema = z.object({ reviews: z.array(z.object({ lemma: z.string(), quality: z.number().int().min(0).max(5) })) });
export const CheckinStatusSchema = z.object({ streak: z.number().int().nonnegative().default(0), todayCompleted: z.boolean().default(false), todayCount: z.number().int().nonnegative().default(0), calendar: z.array(z.object({ date: z.string(), count: z.number().int().nonnegative() })).default([]) });
export type CheckinStatus = z.infer<typeof CheckinStatusSchema>;
const WordDefinitionSchema = z.object({ lemma: z.string(), phonetic: z.string().optional(), partOfSpeech: z.string().optional(), definitionZh: z.string(), definitionEn: z.string().optional(), exampleEn: z.string().optional(), exampleZh: z.string().optional() });
export const WordDefListSchema = z.object({ definitions: z.array(WordDefinitionSchema).default([]) });
export type WordDefList = z.infer<typeof WordDefListSchema>;
export const GrammarPosTagSchema = z.object({ word: z.string().min(1), pos: z.string().min(1), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/) });
export const GrammarAnalysisSchema = z.object({ sentence: z.string().min(1), translation: z.string().min(1), posTags: z.array(GrammarPosTagSchema).min(1).max(100), structure: z.string().min(1), explanation: z.string().min(1) });
export type GrammarAnalysis = z.infer<typeof GrammarAnalysisSchema>;
export type UserNote = { id: string; videoId: string; body: string; timestampSeconds?: number; videoTitle?: string; createdAt: string };
export type DisplayMode = "en" | "zh" | "bilingual";
export {
  getTranslationPollDelay,
  isRetryableTranslationFailure,
  shouldContinueTranslation,
  TRANSLATION_POLL_INITIAL_DELAY_MS,
  TRANSLATION_POLL_MAX_ATTEMPTS,
  TRANSLATION_POLL_MAX_DELAY_MS,
  type TranslationPollSignal,
} from "./translation-polling";

export function isBilibiliVideoId(value: string): boolean { return /^BV[\w]+$/i.test(value.trim()); }
export function extractVideoId(value: string): { id: string; provider: "youtube" | "bilibili" } | null {
  const input = value.trim();
  if (!input) return null;
  const bilibili = input.match(/(?:bilibili\.com\/video\/|b23\.tv\/)?(BV[\w]+)/i);
  if (bilibili) return { id: bilibili[1], provider: "bilibili" };
  const youtube = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))?([A-Za-z0-9_-]{11})(?:[?&#/]|$)/i);
  return youtube ? { id: youtube[1], provider: "youtube" } : null;
}
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600); const minutes = Math.floor((total % 3600) / 60); const remainder = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}
export function parseTimestampRange(value: string): { startTime: number; endTime: number } | null {
  const match = value.match(/^\s*((?:\d+:)?\d{1,2}:\d{2})\s*-\s*((?:\d+:)?\d{1,2}:\d{2})\s*$/); if (!match) return null;
  const toSeconds = (time: string) => time.split(":").reduce((sum, part) => sum * 60 + Number(part), 0);
  const startTime = toSeconds(match[1]); const endTime = toSeconds(match[2]);
  return Number.isFinite(startTime) && Number.isFinite(endTime) && endTime >= startTime ? { startTime, endTime } : null;
}
