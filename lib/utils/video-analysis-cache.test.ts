import assert from "node:assert/strict";
import test from "node:test";
import { hasReusableVideoAnalysis } from "@/lib/utils/video-analysis-cache";

const complete = {
  metadata: { title: "A cached video" },
  transcript: [{ text: "cached transcript" }],
  analysis: { summary: "cached analysis" },
};

test("recognizes a complete shared video analysis", () => {
  assert.equal(hasReusableVideoAnalysis(complete), true);
});

test("does not reuse a transcript-only cache entry as an AI analysis", () => {
  assert.equal(hasReusableVideoAnalysis({ ...complete, analysis: null }), false);
});

test("does not reuse a metadata-only cache entry as an AI analysis", () => {
  assert.equal(hasReusableVideoAnalysis({ ...complete, transcript: null }), false);
});
