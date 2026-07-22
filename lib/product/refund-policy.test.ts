import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRefundEligibility } from "@/lib/product/refund-policy";

describe("manual payment refund policy", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");

  it("allows one request within seven days when the entitlement has no completed analysis", () => {
    assert.deepEqual(getRefundEligibility({
      status: "approved",
      approvedAt: new Date("2026-07-16T12:00:01.000Z"),
      analysisCount: 0,
      refundRequestedAt: null,
    }, now), { eligible: true, reason: null });
  });

  it("rejects requests that are late, used, terminal, or already pending", () => {
    assert.equal(getRefundEligibility({ status: "approved", approvedAt: new Date("2026-07-15T12:00:00.000Z"), analysisCount: 0, refundRequestedAt: null }, now).reason, "window_expired");
    assert.equal(getRefundEligibility({ status: "approved", approvedAt: new Date("2026-07-20T12:00:00.000Z"), analysisCount: 1, refundRequestedAt: null }, now).reason, "analysis_completed");
    assert.equal(getRefundEligibility({ status: "refunded", approvedAt: new Date("2026-07-20T12:00:00.000Z"), analysisCount: 0, refundRequestedAt: null }, now).reason, "not_approved");
    assert.equal(getRefundEligibility({ status: "approved", approvedAt: new Date("2026-07-20T12:00:00.000Z"), analysisCount: 0, refundRequestedAt: new Date("2026-07-21T12:00:00.000Z") }, now).reason, "already_requested");
  });
});
