import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransitionPayment,
  type PaymentStatus,
} from "@/lib/product/payment-state";

describe("payment state contract", () => {
  const allStatuses: PaymentStatus[] = [
    "pending",
    "approved",
    "rejected",
    "refunded",
    "cancelled",
    "failed",
  ];

  it("allows exactly the launch review and post-approval refund transitions", () => {
    assert.equal(canTransitionPayment("pending", "approved"), true);
    assert.equal(canTransitionPayment("pending", "rejected"), true);
    assert.equal(canTransitionPayment("pending", "cancelled"), true);
    assert.equal(canTransitionPayment("pending", "failed"), true);
    assert.equal(canTransitionPayment("approved", "refunded"), true);
  });

  it("rejects duplicate, backwards, and terminal payment transitions", () => {
    for (const status of allStatuses) {
      assert.equal(canTransitionPayment(status, status), false);
    }
    assert.equal(canTransitionPayment("approved", "pending"), false);
    assert.equal(canTransitionPayment("rejected", "approved"), false);
    assert.equal(canTransitionPayment("refunded", "approved"), false);
    assert.equal(canTransitionPayment("cancelled", "approved"), false);
    assert.equal(canTransitionPayment("failed", "approved"), false);
  });
});
