import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseJsonContentWithDiagnostics } from "@/lib/ai/provider";

describe("AI JSON parse diagnostics", () => {
  it("marks a directly valid model response without retaining its content", () => {
    const result = parseJsonContentWithDiagnostics('{"answer":"ok","citations":[]}');

    assert.equal(result.mode, "direct");
    assert.deepEqual(result.value, { answer: "ok", citations: [] });
  });

  it("marks a syntactically repaired response", () => {
    const result = parseJsonContentWithDiagnostics("{'answer':'ok','citations':[],}");

    assert.equal(result.mode, "repaired");
    assert.deepEqual(result.value, { answer: "ok", citations: [] });
  });
});
