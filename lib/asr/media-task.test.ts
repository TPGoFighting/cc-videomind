import assert from "node:assert/strict";
import test from "node:test";
import { AuthorizedMediaAsrTaskInputSchema } from "./media-task";

const validInput = {
  storageKey: "asr/550e8400-e29b-41d4-a716-446655440000.mp3",
  contentType: "audio/mpeg",
  duration: 45,
  title: "授权课程片段",
  sourceVideoId: "BV1xx411c7mD",
};

test("accepts a bounded authorized-media ASR task", () => {
  assert.equal(AuthorizedMediaAsrTaskInputSchema.safeParse(validInput).success, true);
});

test("rejects unbounded duration and unsafe storage paths", () => {
  assert.equal(AuthorizedMediaAsrTaskInputSchema.safeParse({ ...validInput, duration: 0 }).success, false);
  assert.equal(AuthorizedMediaAsrTaskInputSchema.safeParse({ ...validInput, duration: 7201 }).success, false);
  assert.equal(AuthorizedMediaAsrTaskInputSchema.safeParse({ ...validInput, storageKey: "../../uploads/media.mp3" }).success, false);
});
