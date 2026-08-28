import assert from "node:assert/strict";
import test from "node:test";
import { getTranslationPollDelay, shouldContinueTranslation } from "./translation-polling";

test("keeps polling after a partial page or interrupted stream", () => {
  assert.equal(
    shouldContinueTranslation(
      { hasMore: true, sawDone: true, failedBatchCount: 1, receivedUpdates: 4 },
      6,
    ),
    true,
  );
  assert.equal(
    shouldContinueTranslation(
      { hasMore: false, sawDone: false, failedBatchCount: 0, receivedUpdates: 2 },
      4,
    ),
    true,
  );
});

test("stops polling only after all pending segments are translated", () => {
  assert.equal(
    shouldContinueTranslation(
      { hasMore: true, sawDone: true, failedBatchCount: 0, receivedUpdates: 10 },
      0,
    ),
    false,
  );
});

test("uses bounded exponential delays", () => {
  assert.equal(getTranslationPollDelay(0), 1_500);
  assert.equal(getTranslationPollDelay(4), 15_000);
  assert.equal(getTranslationPollDelay(99), 15_000);
});
