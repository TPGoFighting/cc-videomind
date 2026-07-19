import { z } from "zod";

export const TranscriptSegmentSchema = z.object({
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  text: z.string().min(1),
  text_zh: z.string().optional()
});

export const VideoMetadataSchema = z.object({
  videoId: z.string().min(6),
  title: z.string().min(1),
  authorName: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  providerUrl: z.string().url().optional()
});

export const HighlightSchema = z.object({
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  title: z.string().min(1),
  quote: z.string().min(1),
  reason: z.string().min(1)
});

export const CitationSchema = z.object({
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  quote: z.string().min(1)
});

export const VideoAnalysisSchema = z.object({
  summary: z.string().min(1),
  takeaways: z.array(z.string().min(1)).min(3).max(8),
  suggestedQuestions: z.array(z.string().min(1)).min(3).max(8),
  // 综合分析模型稳定产出 3 个高亮；缓存层必须接受该有效结果，
  // 否则会把已完成的分析误判为无缓存并触发重复字幕抓取。
  highlights: z.array(HighlightSchema).min(3).max(8)
});

export const ChatAnswerSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(CitationSchema).min(1).max(5)
});

export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;
export type Highlight = z.infer<typeof HighlightSchema>;
export type VideoAnalysis = z.infer<typeof VideoAnalysisSchema>;
export type ChatAnswer = z.infer<typeof ChatAnswerSchema>;

export type JsonResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

// ─── 要点时刻 (LongCut 风格) ─────────────────────────────────────────────────

export const KeyMomentSchema = z.object({
  title: z.string().min(1).max(120),
  title_zh: z.string().max(120).optional(),
  timestamp: z.string().regex(
    /^(?:\d{1,2}:)?\d{1,2}:\d{2}-(?:\d{1,2}:)?\d{1,2}:\d{2}$/,
    "timestamp 格式必须为 [MM:SS-MM:SS] 或 [HH:MM:SS-HH:MM:SS]"
  ),
  quote: z.string().min(1).max(500),
  quote_zh: z.string().max(500).optional(),
  reason: z.string().min(1).max(400),
  reason_zh: z.string().max(400).optional()
});

export type KeyMoment = z.infer<typeof KeyMomentSchema>;

// ─── 结构化摘要 Takeaway ──────────────────────────────────────────────────────

export const SummaryTakeawaySchema = z.object({
  label: z.string().min(1).max(120),
  label_zh: z.string().max(120).optional(),
  insight: z.string().min(1).max(600),
  insight_zh: z.string().max(600).optional(),
  timestamps: z.array(
    z.string().regex(/^\d{1,2}:\d{2}$/, "timestamp 格式必须为 M:SS 或 MM:SS")
  ).max(2)
});

export type SummaryTakeaway = z.infer<typeof SummaryTakeawaySchema>;

// ─── 生成模式 ─────────────────────────────────────────────────────────────────

export const MomentsModeSchema = z.enum(["smart", "fast"]);
export type MomentsMode = z.infer<typeof MomentsModeSchema>;

// ─── 请求 schema ──────────────────────────────────────────────────────────────

export const GenerateMomentsRequestSchema = z.object({
  videoId: z.string().min(6).max(20),
  mode: MomentsModeSchema.default("smart"),
  theme: z.string().max(200).optional(),
  targetLanguage: z.enum(["zh", "en"]).default("zh")
});

export const GenerateSummaryRequestSchema = z.object({
  videoId: z.string().min(6).max(20),
  targetLanguage: z.enum(["zh", "en"]).default("zh")
});

// ─── 调试信息（附加在 API 响应中，方便前端诊断） ──────────────────────────────

export interface GenerationDebug {
  model: string;
  promptLength: number;
  rawResponseLength: number;
  rawResponsePreview: string;
  parseCount: number;
  validateCount: number;
  finalCount: number;
}

export function createEmptyDebug(): GenerationDebug {
  return {
    model: "", promptLength: 0, rawResponseLength: 0,
    rawResponsePreview: "", parseCount: 0, validateCount: 0, finalCount: 0
  };
}

// ─── 笔记 ─────────────────────────────────────────────────────────────────────

export const UserNoteSchema = z.object({
  id: z.string().uuid(),
  video_id: z.string(),
  body: z.string(),
  timestamp_seconds: z.number().nullable().optional(),
  created_at: z.string(),
  video_title: z.string().optional()
});
export type UserNote = z.infer<typeof UserNoteSchema>;

// ─── 英语学习增强 ──────────────────────────────────────────────────────────────

export const WordDefinitionSchema = z.object({
  lemma: z.string().min(1),
  phonetic: z.string().optional(),
  partOfSpeech: z.string().optional(),
  definitionZh: z.string().min(1),
  definitionEn: z.string().optional(),
  exampleEn: z.string().optional(),
  exampleZh: z.string().optional()
});
export type WordDefinition = z.infer<typeof WordDefinitionSchema>;

export const UserQuoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  videoId: z.string(),
  textEn: z.string().min(1),
  textZh: z.string().optional(),
  startTime: z.number(),
  endTime: z.number(),
  notes: z.string().optional(),
  createdAt: z.string(),
  videoTitle: z.string().optional()
});
export type UserQuote = z.infer<typeof UserQuoteSchema>;

export const DisplayModeSchema = z.enum(["en", "zh", "bilingual"]);
export type DisplayMode = z.infer<typeof DisplayModeSchema>;

export const WordDefinitionsRequestSchema = z.object({
  lemmas: z.array(z.string().min(1)).min(1).max(400)
});

export const TranslateTranscriptRequestSchema = z.object({
  videoId: z.string().min(6).max(20)
});

export const SaveQuoteRequestSchema = z.object({
  videoId: z.string().min(6),
  textEn: z.string().min(1).max(2000),
  textZh: z.string().max(2000).optional(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  notes: z.string().max(5000).optional()
});

export const SaveWordRequestSchema = z.object({
  lemma: z.string().min(1),
  videoId: z.string().min(6)
});

// ─── 单词复习 ─────────────────────────────────────────────────────────────────

export const ReviewResultSchema = z.object({
  lemma: z.string().min(1),
  quality: z.number().int().min(0).max(5)
});
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

export interface ReviewWord {
  lemma: string;
  phonetic?: string;
  partOfSpeech?: string;
  definitionZh: string;
  definitionEn?: string;
  exampleEn?: string;
  exampleZh?: string;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  status: string;
}

export interface CheckinStatus {
  streak: number;
  todayCompleted: boolean;
  todayCount: number;
  calendar: { date: string; count: number }[];
}
