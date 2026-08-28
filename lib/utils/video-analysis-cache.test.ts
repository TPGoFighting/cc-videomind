import assert from "node:assert/strict";
import test from "node:test";
import {
  hasReusableVideoAnalysis,
  normalizeAnalysisForCache,
} from "@/lib/utils/video-analysis-cache";

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

test("keeps generated highlights inside a positive source range", () => {
  const result = normalizeAnalysisForCache(
    {
      summary: "Ready",
      takeaways: ["One", "Two", "Three"],
      suggestedQuestions: ["One", "Two", "Three"],
      highlights: [{ startTime: 10, endTime: 0, title: "Moment", quote: "Quote", reason: "Reason" },
        { startTime: 20, endTime: 25, title: "Later", quote: "Quote", reason: "Reason" },
        { startTime: 30, endTime: 35, title: "Close", quote: "Quote", reason: "Reason" }],
    },
    [{ startTime: 10, endTime: 12, text: "Source" }],
  );

  assert.equal(result.highlights[0]?.endTime, 12);
  assert.equal(result.highlights[1]?.endTime, 25);
});
