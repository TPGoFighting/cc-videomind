import assert from "node:assert/strict";
import test from "node:test";
import { deriveComprehensiveFromAnalysis } from "@/lib/utils/comprehensive-cache";

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
