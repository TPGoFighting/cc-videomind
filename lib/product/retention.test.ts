import assert from "node:assert/strict";
import test from "node:test";
import { SaveWordRequestSchema } from "@/lib/types";
import {
  buildReviewSourceHref,
  buildWeeklyReviewSummary,
  calculateReviewSchedule,
  explainDueReview,
  getReviewCadencePolicy,
  getInitialReviewAt,
  parseVideoStartTime,
  ReviewSubmissionRequestSchema,
} from "./retention";

test("retention cadence keeps the first review promise and changes later pacing", () => {
  const now = new Date("2026-07-22T04:00:00.000Z");
  const input = { quality: 4, repetitions: 2, easeFactor: 2.5, intervalDays: 3 };
  const light = calculateReviewSchedule(input, "light", now);
  const steady = calculateReviewSchedule(input, "steady", now);
  const focused = calculateReviewSchedule(input, "focused", now);

  assert.equal(getReviewCadencePolicy("light").firstReviewDelayHours, 24);
  assert.equal(getReviewCadencePolicy("steady").firstReviewDelayHours, 24);
  assert.equal(getReviewCadencePolicy("focused").firstReviewDelayHours, 24);
  assert.ok(light.intervalDays > steady.intervalDays);
  assert.ok(steady.intervalDays > focused.intervalDays);
  assert.equal(getReviewCadencePolicy("steady").dailyLimit, 20);
});

test("new learning items always enter the queue about one day later", () => {
  const now = new Date("2026-07-22T04:00:00.000Z");
  assert.equal(getInitialReviewAt(now), "2026-07-23T04:00:00.000Z");
});

test("a saved word may carry its source timestamp", () => {
  const parsed = SaveWordRequestSchema.parse({
    lemma: "listen",
    videoId: "eIho2S0ZahI",
    startTime: 42.5,
  });
  assert.equal(parsed.startTime, 42.5);
  assert.throws(() => SaveWordRequestSchema.parse({
    lemma: "listen",
    videoId: "eIho2S0ZahI",
    startTime: -1,
  }));
});

test("failed recall returns in ten minutes with an explanation", () => {
  const now = new Date("2026-07-22T04:00:00.000Z");
  const result = calculateReviewSchedule(
    { quality: 1, repetitions: 4, easeFactor: 2.1, intervalDays: 12 },
    "steady",
    now,
  );

  assert.equal(new Date(result.nextReviewAt).getTime() - now.getTime(), 10 * 60 * 1000);
  assert.equal(result.repetitions, 0);
  assert.equal(result.status, "learning");
  assert.match(result.explanation, /10 分钟/);
});

test("review source links preserve a validated video and optional timestamp", () => {
  assert.equal(
    buildReviewSourceHref({ videoId: "eIho2S0ZahI", startTime: 91.8 }),
    "/video/eIho2S0ZahI?t=91&resume=review",
  );
  assert.equal(
    buildReviewSourceHref({ videoId: "eIho2S0ZahI", startTime: null }),
    "/video/eIho2S0ZahI?resume=review",
  );
  assert.throws(() => buildReviewSourceHref({ videoId: "not/a/video", startTime: 1 }));
  assert.equal(parseVideoStartTime("91.8"), 91);
  assert.equal(parseVideoStartTime("-1"), undefined);
  assert.equal(parseVideoStartTime(["91"]), undefined);
});

test("review submission identifies the owned item kind without accepting content", () => {
  const parsed = ReviewSubmissionRequestSchema.parse({
    reviews: [
      { kind: "word", id: "word-id", lemma: "listen", quality: 4 },
      { kind: "quote", id: "quote-id", quality: 0 },
    ],
  });

  assert.equal(parsed.reviews.length, 2);
  assert.throws(() => ReviewSubmissionRequestSchema.parse({
    reviews: [{ kind: "quote", id: "quote-id", quality: 4, textEn: "private content" }],
  }));
});

test("due explanations distinguish a first review from spaced review", () => {
  assert.match(explainDueReview({ repetitions: 0 }), /约 24 小时前保存/);
  assert.match(explainDueReview({ repetitions: 3 }), /上次表现/);
});

test("weekly review stays honest until the full data window and activity threshold exist", () => {
  const now = new Date("2026-07-22T04:00:00.000Z");
  const collecting = buildWeeklyReviewSummary({
    accountCreatedAt: "2026-07-19T04:00:00.000Z",
    activeDays: 2,
    completedReviews: 8,
    savedItems: 4,
    dueCount: 2,
  }, now);

  assert.equal(collecting.status, "collecting");
  assert.equal(collecting.message, "继续学习以生成周报");
  assert.ok(collecting.missing.includes("full_window"));

  const ready = buildWeeklyReviewSummary({
    accountCreatedAt: "2026-07-01T04:00:00.000Z",
    activeDays: 2,
    completedReviews: 3,
    savedItems: 1,
    dueCount: 0,
  }, now);

  assert.equal(ready.status, "ready");
  assert.deepEqual(ready.missing, []);
  assert.match(ready.message, /本周完成 3 次复习/);
});
