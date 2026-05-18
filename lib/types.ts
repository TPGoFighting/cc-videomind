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
