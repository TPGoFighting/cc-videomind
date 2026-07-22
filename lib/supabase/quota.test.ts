import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkAnalysisQuota,
  getAuthenticatedUserId,
  getBearerToken,
} from "@/lib/supabase/quota";

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

describe("self-hosted authentication and quota boundaries", () => {
  it("treats a request without local mode or database auth as anonymous", async () => {
    const previousLocalMode = process.env.LOCAL_MODE;
    const previousPublicLocalMode = process.env.NEXT_PUBLIC_LOCAL_MODE;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.LOCAL_MODE;
    delete process.env.NEXT_PUBLIC_LOCAL_MODE;
    delete process.env.DATABASE_URL;

    try {
      assert.equal(await getAuthenticatedUserId(new Request("https://example.com")), null);
    } finally {
      if (previousLocalMode === undefined) delete process.env.LOCAL_MODE;
      else process.env.LOCAL_MODE = previousLocalMode;
      if (previousPublicLocalMode === undefined) delete process.env.NEXT_PUBLIC_LOCAL_MODE;
      else process.env.NEXT_PUBLIC_LOCAL_MODE = previousPublicLocalMode;
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it("reports the self-hosted quota boundary consistently", async () => {
    const anonymous = await checkAnalysisQuota(null);
    const authenticated = await checkAnalysisQuota("user-1");

    assert.equal(anonymous.allowed, true);
    assert.equal(anonymous.anonymous, true);
    assert.equal(authenticated.allowed, true);
    assert.equal(authenticated.anonymous, false);
  });
});
