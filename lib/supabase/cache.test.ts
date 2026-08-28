import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeLegacyEmptyAnalysis,
  normalizeLegacyMetadata,
  normalizeLegacyVideoAnalysis,
} from "./cache";

test("normalizes a legacy empty local analysis object to a cache miss", () => {
  assert.equal(normalizeLegacyEmptyAnalysis({}), null);
  assert.equal(normalizeLegacyEmptyAnalysis(null), null);
  assert.deepEqual(
    normalizeLegacyEmptyAnalysis({ summary: "Ready" }),
    { summary: "Ready" },
  );
});

test("normalizes empty optional metadata URLs from legacy cache rows", () => {
  assert.deepEqual(
    normalizeLegacyMetadata({
      videoId: "video-1",
      title: "Ready",
      authorName: "",
      thumbnailUrl: "",
      providerUrl: "",
    }),
    { videoId: "video-1", title: "Ready", authorName: "" },
  );
});

test("normalizes zero-length highlight ranges from legacy analysis rows", () => {
  assert.deepEqual(
    normalizeLegacyVideoAnalysis({
      summary: "Ready",
      highlights: [{ startTime: 0, endTime: 0, title: "Opening", quote: "Hello", reason: "Context" }],
    }),
    {
      summary: "Ready",
      highlights: [{ startTime: 0, endTime: 1, title: "Opening", quote: "Hello", reason: "Context" }],
    },
  );
});
