import { z } from "zod";

const SourceSchema = z.literal("youtube");
const DurationSchema = z.number().int().nonnegative().max(24 * 60 * 60 * 1000);
const ErrorCodeSchema = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const ModelAliasSchema = z.string().min(1).max(80).regex(/^[a-zA-Z0-9._:/-]+$/);

export const PRODUCT_EVENT_NAMES = [
  "video_parse_started",
  "video_parse_completed",
  "video_parse_failed",
  "analysis_completed",
  "analysis_failed",
  "learning_item_saved",
  "review_opened",
  "review_completed",
  "upgrade_opened",
  "upgrade_paid",
] as const;

export const ProductEventSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("video_parse_started"),
    payload: z.object({ source: SourceSchema }).strict(),
  }).strict(),
  z.object({
    name: z.literal("video_parse_completed"),
    payload: z.object({
      source: SourceSchema,
      durationMs: DurationSchema,
      cacheHit: z.boolean(),
    }).strict(),
  }).strict(),
  z.object({
    name: z.literal("video_parse_failed"),
    payload: z.object({
      source: SourceSchema,
      durationMs: DurationSchema,
      errorCode: ErrorCodeSchema,
    }).strict(),
  }).strict(),
  z.object({
    name: z.literal("analysis_completed"),
    payload: z.object({
      durationMs: DurationSchema,
      modelAlias: ModelAliasSchema,
      cacheHit: z.boolean(),
      costMicrousd: z.number().int().nonnegative().max(1_000_000_000).optional(),
    }).strict(),
  }).strict(),
  z.object({
    name: z.literal("analysis_failed"),
    payload: z.object({
      durationMs: DurationSchema,
      modelAlias: ModelAliasSchema,
      errorCode: ErrorCodeSchema,
    }).strict(),
  }).strict(),
  z.object({
    name: z.literal("learning_item_saved"),
    payload: z.object({
      itemKind: z.enum(["word", "quote"]),
      source: SourceSchema,
      isFirst: z.boolean(),
    }).strict(),
  }).strict(),
  z.object({
    name: z.literal("review_opened"),
    payload: z.object({ dueCount: z.number().int().nonnegative().max(10_000) }).strict(),
  }).strict(),
  z.object({
    name: z.literal("review_completed"),
    payload: z.object({
      completedCount: z.number().int().positive().max(50),
      accuracyBucket: z.enum(["low", "mixed", "high"]),
    }).strict(),
  }).strict(),
  z.object({
    name: z.literal("upgrade_opened"),
    payload: z.object({
      tier: z.enum(["pro", "max"]),
      channel: z.enum(["manual_review", "stripe"]),
      status: z.literal("opened"),
    }).strict(),
  }).strict(),
  z.object({
    name: z.literal("upgrade_paid"),
    payload: z.object({
      tier: z.enum(["pro", "max"]),
      channel: z.enum(["manual_review", "stripe"]),
      status: z.enum(["approved", "rejected", "refunded"]),
    }).strict(),
  }).strict(),
]);

export type ProductEvent = z.infer<typeof ProductEventSchema>;

export const AnalyticsPreferenceSchema = z.object({
  analyticsEnabled: z.boolean(),
}).strict();

export function getAnalyticsExpiry(now = new Date(), retentionDays = 180): Date {
  return new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}

export function getAccuracyBucket(qualities: number[]): "low" | "mixed" | "high" {
  const average = qualities.reduce((sum, value) => sum + value, 0) / Math.max(qualities.length, 1);
  if (average < 3) return "low";
  if (average < 4.5) return "mixed";
  return "high";
}
