import { z } from "zod";
import { VideoIdSchema } from "@/lib/youtube/id";

export const ReviewCadenceSchema = z.enum(["light", "steady", "focused"]);
export type ReviewCadence = z.infer<typeof ReviewCadenceSchema>;

export interface ReviewSource {
  videoId: string;
  videoTitle: string | null;
  startTime: number | null;
  href: string;
}

interface ReviewQueueBase {
  id: string;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string;
  status: string;
  dueReason: string;
  source: ReviewSource;
}

export interface WordReviewQueueItem extends ReviewQueueBase {
  kind: "word";
  lemma: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  definitionZh: string;
  definitionEn: string | null;
  exampleEn: string | null;
  exampleZh: string | null;
}

export interface QuoteReviewQueueItem extends ReviewQueueBase {
  kind: "quote";
  textEn: string;
  textZh: string | null;
}

export type ReviewQueueItem = WordReviewQueueItem | QuoteReviewQueueItem;

export interface TodayReviewSummary {
  dueCount: number;
  wordCount: number;
  quoteCount: number;
  nextReviewAt: string | null;
  cadence: ReviewCadence;
  dailyLimit: number;
}

const ReviewQualitySchema = z.number().int().min(0).max(5);
const WordReviewSubmissionSchema = z.object({
  kind: z.literal("word"),
  id: z.string().min(1).max(200),
  lemma: z.string().min(1).max(100),
  quality: ReviewQualitySchema,
}).strict();
const QuoteReviewSubmissionSchema = z.object({
  kind: z.literal("quote"),
  id: z.string().min(1).max(200),
  quality: ReviewQualitySchema,
}).strict();

export const ReviewSubmissionRequestSchema = z.object({
  reviews: z.array(z.discriminatedUnion("kind", [
    WordReviewSubmissionSchema,
    QuoteReviewSubmissionSchema,
  ])).min(1).max(50),
}).strict();

export function parseVideoStartTime(value: string | string[] | undefined) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 24 * 60 * 60) return undefined;
  return Math.floor(parsed);
}

const REVIEW_CADENCE_POLICIES = {
  light: {
    label: "轻量",
    dailyLimit: 10,
    intervalMultiplier: 1.5,
    firstReviewDelayHours: 24,
  },
  steady: {
    label: "稳步",
    dailyLimit: 20,
    intervalMultiplier: 1,
    firstReviewDelayHours: 24,
  },
  focused: {
    label: "强化",
    dailyLimit: 30,
    intervalMultiplier: 0.75,
    firstReviewDelayHours: 24,
  },
} as const satisfies Record<ReviewCadence, {
  label: string;
  dailyLimit: number;
  intervalMultiplier: number;
  firstReviewDelayHours: number;
}>;

export function getReviewCadencePolicy(cadence: ReviewCadence) {
  return REVIEW_CADENCE_POLICIES[cadence];
}

export function getInitialReviewAt(now = new Date()) {
  return new Date(
    now.getTime() + REVIEW_CADENCE_POLICIES.steady.firstReviewDelayHours * 60 * 60 * 1000,
  ).toISOString();
}

export function isActiveReviewDay(completedReviews: number) {
  return Number.isFinite(completedReviews) && completedReviews > 0;
}

export function calculateReviewSchedule(
  input: {
    quality: number;
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
  },
  cadence: ReviewCadence,
  now = new Date(),
) {
  if (input.quality < 3) {
    return {
      repetitions: 0,
      easeFactor: Math.max(1.3, input.easeFactor - 0.2),
      intervalDays: 0,
      nextReviewAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      status: "learning" as const,
      explanation: "这次还不熟，约 10 分钟后会再出现一次。",
    };
  }

  const baseDays = input.repetitions === 0
    ? 1
    : input.repetitions === 1
      ? 3
      : Math.max(1, Math.round(input.intervalDays * input.easeFactor));
  const qualityAdjustedDays = input.quality >= 4
    ? Math.max(1, Math.round(baseDays * 1.2))
    : baseDays;
  const policy = getReviewCadencePolicy(cadence);
  const intervalDays = Math.max(1, Math.round(qualityAdjustedDays * policy.intervalMultiplier));
  const repetitions = input.repetitions + 1;
  const easeFactor = Math.max(
    1.3,
    input.easeFactor + (0.1 - (5 - input.quality) * (0.08 + (5 - input.quality) * 0.02)),
  );

  return {
    repetitions,
    easeFactor,
    intervalDays,
    nextReviewAt: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString(),
    status: intervalDays >= 30 ? "mastered" as const : "reviewing" as const,
    explanation: `根据本次表现和${policy.label}节奏，下次将在约 ${intervalDays} 天后出现。`,
  };
}

export function explainDueReview(input: { repetitions: number }) {
  return input.repetitions === 0
    ? "首次复习：这是你约 24 小时前保存的内容。"
    : "间隔复习：根据上次表现，今天是适合巩固的时间。";
}

export function buildReviewSourceHref(input: { videoId: string; startTime?: number | null }) {
  const videoId = VideoIdSchema.parse(input.videoId);
  if (typeof input.startTime !== "number" || !Number.isFinite(input.startTime) || input.startTime < 0) {
    return `/video/${videoId}?resume=review`;
  }
  return `/video/${videoId}?t=${Math.floor(input.startTime)}&resume=review`;
}

type WeeklyMissingCondition = "full_window" | "active_days" | "completed_reviews" | "saved_items";

export function buildWeeklyReviewSummary(
  input: {
    accountCreatedAt: string;
    activeDays: number;
    completedReviews: number;
    savedItems: number;
    dueCount: number;
  },
  now = new Date(),
) {
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const accountCreatedAt = new Date(input.accountCreatedAt);
  const missing: WeeklyMissingCondition[] = [];

  if (!Number.isFinite(accountCreatedAt.getTime()) || accountCreatedAt > windowStart) missing.push("full_window");
  if (input.activeDays < 2) missing.push("active_days");
  if (input.completedReviews < 3) missing.push("completed_reviews");
  if (input.savedItems < 1) missing.push("saved_items");

  return {
    status: missing.length === 0 ? "ready" as const : "collecting" as const,
    windowStart: windowStart.toISOString(),
    windowEnd: now.toISOString(),
    activeDays: input.activeDays,
    completedReviews: input.completedReviews,
    savedItems: input.savedItems,
    dueCount: input.dueCount,
    missing,
    message: missing.length === 0
      ? `本周完成 ${input.completedReviews} 次复习，在 ${input.activeDays} 天里持续巩固。`
      : "继续学习以生成周报",
  };
}
