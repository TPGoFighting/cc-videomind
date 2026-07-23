import assert from "node:assert/strict";
import test from "node:test";
import {
  LEARNING_GUIDANCE_DISMISSED_KEY,
  dismissLearningGuidance,
  shouldShowLearningGuidance,
} from "./learning-guidance";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem(key: string) {
      assert.equal(key, LEARNING_GUIDANCE_DISMISSED_KEY);
      return value;
    },
    setItem(key: string, nextValue: string) {
      assert.equal(key, LEARNING_GUIDANCE_DISMISSED_KEY);
      value = nextValue;
    },
  };
}

test("shows learning guidance until this browser has dismissed it", () => {
  const storage = createStorage();

  assert.equal(shouldShowLearningGuidance(storage), true);
  dismissLearningGuidance(storage);
  assert.equal(shouldShowLearningGuidance(storage), false);
});

test("does not show the learning guide when local persistence is unavailable", () => {
  assert.equal(shouldShowLearningGuidance(null), false);
});
