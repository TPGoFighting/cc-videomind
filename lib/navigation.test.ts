import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeReturnPath } from "@/lib/navigation";

describe("post-authentication return path", () => {
  it("keeps safe in-app destinations and their query state", () => {
    assert.equal(normalizeReturnPath("/video/eIho2S0ZahI?tab=notes#saved"), "/video/eIho2S0ZahI?tab=notes#saved");
    assert.equal(normalizeReturnPath("/review"), "/review");
  });

  it("rejects external, protocol-relative, API, and authentication-loop targets", () => {
    assert.equal(normalizeReturnPath("https://example.com"), "/");
    assert.equal(normalizeReturnPath("//example.com"), "/");
    assert.equal(normalizeReturnPath("/\\example.com"), "/");
    assert.equal(normalizeReturnPath("/api/me"), "/");
    assert.equal(normalizeReturnPath("/login?next=/review"), "/");
  });
});
