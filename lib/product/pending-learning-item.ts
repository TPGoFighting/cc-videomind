import { z } from "zod";
import { VideoIdSchema } from "@/lib/youtube/id";

export const PENDING_LEARNING_ITEM_KEY = "teach-player:pending-learning-item";

const PendingQuoteSchema = z.object({
  kind: z.literal("quote"),
  videoId: VideoIdSchema,
  textEn: z.string().min(1).max(4_000),
  textZh: z.string().max(4_000).optional(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  createdAt: z.number().int().positive(),
});

const PendingWordSchema = z.object({
  kind: z.literal("word"),
  videoId: VideoIdSchema,
  lemma: z.string().min(1).max(100),
  startTime: z.number().nonnegative().optional(),
  createdAt: z.number().int().positive(),
});

export const PendingLearningItemSchema = z.discriminatedUnion("kind", [
  PendingQuoteSchema,
  PendingWordSchema,
]);

export type PendingLearningItem = z.infer<typeof PendingLearningItemSchema>;
export type LearningSaveDecision = "preview" | "wait_for_auth" | "queue_and_login" | "persist";

const MAX_PENDING_AGE_MS = 30 * 60 * 1000;

export function parsePendingLearningItem(
  value: string | null,
  now = Date.now(),
): PendingLearningItem | null {
  if (!value) return null;
  try {
    const parsed = PendingLearningItemSchema.safeParse(JSON.parse(value));
    if (!parsed.success) return null;
    if (now - parsed.data.createdAt > MAX_PENDING_AGE_MS) return null;
    if (parsed.data.createdAt > now + 60_000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function serializePendingLearningItem(item: PendingLearningItem): string {
  return JSON.stringify(PendingLearningItemSchema.parse(item));
}

export function decideLearningSave(input: {
  fixture: boolean;
  authLoading: boolean;
  authenticated: boolean;
}): LearningSaveDecision {
  if (input.fixture) return "preview";
  if (input.authLoading) return "wait_for_auth";
  if (!input.authenticated) return "queue_and_login";
  return "persist";
}

export function buildPendingSaveLoginHref(videoId: string): string {
  const safeVideoId = VideoIdSchema.parse(videoId);
  const returnPath = `/video/${safeVideoId}?resume=save`;
  return `/login?next=${encodeURIComponent(returnPath)}`;
}
