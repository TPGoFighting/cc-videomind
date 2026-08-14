import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisQuota } from "@/lib/product/analysis-quota";

describe("analysis quota contract", () => {
  it("keeps the free tier lifetime-bounded", () => {
    assert.deepEqual(buildAnalysisQuota("free", 2, null), {
      allowed: true,
      tier: "free",
      totalLimit: 3,
      totalUsed: 2,
      startsAt: null,
    });
    assert.equal(buildAnalysisQuota("free", 3, null).allowed, false);
  });

  it("uses the paid entitlement start to scope the 30-day allowance", () => {
    const startsAt = new Date("2026-07-22T00:00:00.000Z");
    const quota = buildAnalysisQuota("pro", 29, startsAt);
    assert.equal(quota.allowed, true);
    assert.equal(quota.totalLimit, 30);
    assert.equal(quota.startsAt?.toISOString(), startsAt.toISOString());
    assert.equal(buildAnalysisQuota("max", 100, startsAt).allowed, false);
  });
});
