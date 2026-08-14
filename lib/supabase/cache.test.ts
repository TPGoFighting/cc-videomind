import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLegacyEmptyAnalysis } from "./cache";

test("normalizes a legacy empty local analysis object to a cache miss", () => {
  assert.equal(normalizeLegacyEmptyAnalysis({}), null);
  assert.equal(normalizeLegacyEmptyAnalysis(null), null);
  assert.deepEqual(
    normalizeLegacyEmptyAnalysis({ summary: "Ready" }),
    { summary: "Ready" },
  );
});
