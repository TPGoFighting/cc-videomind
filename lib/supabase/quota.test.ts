import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBearerToken } from "@/lib/supabase/quota";

describe("getBearerToken", () => {
  it("returns the token from a Bearer authorization header", () => {
    const request = new Request("https://example.com", {
      headers: { authorization: "Bearer abc.def.ghi" }
    });

    assert.equal(getBearerToken(request), "abc.def.ghi");
  });

  it("returns null when the authorization scheme is not Bearer", () => {
    const request = new Request("https://example.com", {
      headers: { authorization: "Basic abc" }
    });

    assert.equal(getBearerToken(request), null);
  });
});
