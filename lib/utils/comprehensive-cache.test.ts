import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveComprehensiveFromAnalysis,
  normalizeComprehensiveForCache,
} from "@/lib/utils/comprehensive-cache";

test("derives reusable panels from an existing analysis without an AI call", () => {
  const result = deriveComprehensiveFromAnalysis({
    summary: "Cached summary",
    takeaways: ["First", "Second", "Third"],
    suggestedQuestions: ["Question one", "Question two", "Question three"],
    highlights: [
      { startTime: 5, endTime: 15, title: "Opening", quote: "Welcome", reason: "Sets context" },
      { startTime: 65, endTime: 75, title: "Middle", quote: "Details", reason: "Explains the point" },
      { startTime: 125, endTime: 135, title: "Close", quote: "Thanks", reason: "Wraps up" },
    ],
  });

  assert.equal(result.takeaways[0]?.insight, "First");
  assert.equal(result.moments[1]?.timestamp, "1:05-1:15");
  assert.deepEqual(result.suggestedQuestions, ["Question one", "Question two", "Question three"]);
});

test("repairs zero-length comprehensive ranges without another AI call", () => {
  const result = normalizeComprehensiveForCache({
    summary: "Cached summary",
    takeaways: [],
    moments: [{
      title: "Opening",
      timestamp: "0:00-0:00",
      quote: "Welcome",
      reason: "Sets context",
    }],
    highlights: [{
      startTime: 0,
      endTime: 0,
      title: "Opening",
      quote: "Welcome",
      reason: "Sets context",
    }],
    suggestedQuestions: [],
  });

  assert.equal(result.highlights[0]?.endTime, 1);
  assert.equal(result.moments[0]?.timestamp, "0:00-0:01");
});
