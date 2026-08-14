import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAccuracyBucket,
  getAnalyticsExpiry,
  ProductEventSchema,
} from "./analytics-event";

describe("privacy-safe product event contract", () => {
  it("accepts only the declared fields for each event", () => {
    assert.equal(ProductEventSchema.safeParse({
      name: "video_parse_completed",
      payload: { source: "youtube", durationMs: 1_250, cacheHit: true },
    }).success, true);

    assert.equal(ProductEventSchema.safeParse({
      name: "learning_item_saved",
      payload: { itemKind: "quote", source: "youtube", isFirst: true },
    }).success, true);

    assert.equal(ProductEventSchema.safeParse({
      name: "chat_completed",
      payload: {
        durationMs: 840,
        transcriptCacheHit: true,
        modelMode: "primary",
        outcome: "grounded",
        jsonParseMode: "direct",
        citationNormalized: false,
      },
    }).success, true);

    assert.equal(ProductEventSchema.safeParse({
      name: "chat_failed",
      payload: {
        durationMs: 840,
        transcriptCacheHit: false,
        errorCode: "ai_rate_limited",
      },
    }).success, true);
  });

  it("rejects URL, transcript, prompt, answer, and note content", () => {
    for (const forbiddenField of ["url", "transcript", "prompt", "answer", "note"]) {
      const result = ProductEventSchema.safeParse({
        name: "video_parse_started",
        payload: { source: "youtube", [forbiddenField]: "private content" },
      });
      assert.equal(result.success, false, `${forbiddenField} must be rejected`);
    }

    assert.equal(ProductEventSchema.safeParse({
      name: "chat_completed",
      payload: {
        durationMs: 840,
        transcriptCacheHit: false,
        modelMode: "primary",
        outcome: "grounded",
        jsonParseMode: "direct",
        citationNormalized: false,
        answer: "private answer",
      },
    }).success, false);
  });

  it("uses bounded retention and coarse review accuracy", () => {
    const start = new Date("2026-07-22T00:00:00.000Z");
    assert.equal(getAnalyticsExpiry(start).toISOString(), "2027-01-18T00:00:00.000Z");
    assert.equal(getAccuracyBucket([1, 2, 2]), "low");
    assert.equal(getAccuracyBucket([3, 4]), "mixed");
    assert.equal(getAccuracyBucket([5, 4]), "high");
  });
});
