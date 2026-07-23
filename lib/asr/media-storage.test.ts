import assert from "node:assert/strict";
import test from "node:test";
import { MediaStorageKeySchema, mediaExtensionFor } from "./media-storage";

test("only accepts allowlisted media MIME types and generated storage keys", () => {
  assert.equal(mediaExtensionFor("video/mp4"), "mp4");
  assert.equal(mediaExtensionFor("audio/webm"), "webm");
  assert.equal(mediaExtensionFor("application/octet-stream"), null);
  assert.equal(
    MediaStorageKeySchema.safeParse("asr/550e8400-e29b-41d4-a716-446655440000.mp4").success,
    true,
  );
  assert.equal(MediaStorageKeySchema.safeParse("../../private.mp4").success, false);
});
