import assert from "node:assert/strict";
import test from "node:test";
import { createInitialReviewState, FIRST_REVIEW_DELAY_MS } from "./review-schedule";

test("schedules a newly saved word for its first review one day later", () => {
  const now = new Date("2026-07-22T04:00:00.000Z");
  const state = createInitialReviewState("listen", now);

  assert.equal(new Date(state.nextReviewAt).getTime() - now.getTime(), FIRST_REVIEW_DELAY_MS);
  assert.equal(state.intervalDays, 1);
  assert.equal(state.status, "learning");
});
