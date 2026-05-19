import { z } from "zod";

export const TranscriptSegmentSchema = z.object({
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  text: z.string().min(1)
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
  highlights: z.array(HighlightSchema).min(5).max(8)
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
  timestamp: z.string().regex(
    /^(?:\d{1,2}:)?\d{1,2}:\d{2}-(?:\d{1,2}:)?\d{1,2}:\d{2}$/,
    "timestamp 格式必须为 [MM:SS-MM:SS] 或 [HH:MM:SS-HH:MM:SS]"
  ),
  quote: z.string().min(1).max(500),
  reason: z.string().min(1).max(400)
});

export type KeyMoment = z.infer<typeof KeyMomentSchema>;

// ─── 结构化摘要 Takeaway ──────────────────────────────────────────────────────

export const SummaryTakeawaySchema = z.object({
  label: z.string().min(1).max(120),
  insight: z.string().min(1).max(600),
  timestamps: z.array(
    z.string().regex(/^\d{1,2}:\d{2}$/, "timestamp 格式必须为 M:SS 或 MM:SS")
  ).min(1).max(2)
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
