import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getTencentBearerToken,
  getTencentSessionCookieOptions,
  TENCENT_SESSION_COOKIE,
} from "@/lib/tencent-auth";

describe("Tencent session contract", () => {
  it("accepts only a non-empty Bearer token", () => {
    assert.equal(getTencentBearerToken(new Request("https://example.com", {
      headers: { authorization: "Bearer mobile-token" },
    })), "mobile-token");
    assert.equal(getTencentBearerToken(new Request("https://example.com", {
      headers: { authorization: "Basic mobile-token" },
    })), null);
    assert.equal(getTencentBearerToken(new Request("https://example.com", {
      headers: { authorization: "Bearer   " },
    })), null);
  });

  it("keeps browser session cookies HttpOnly, same-site, and scoped to the app", () => {
    const expires = new Date("2030-01-01T00:00:00.000Z");
    const options = getTencentSessionCookieOptions(expires, true);

    assert.equal(TENCENT_SESSION_COOKIE, "teachplayer_session");
    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.path, "/");
    assert.equal(options.expires, expires);
  });
});
