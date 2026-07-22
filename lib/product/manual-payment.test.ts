import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getManualPaymentConfig,
  getPlanOrderSnapshot,
  grantSubscriptionAccess,
  hasActiveSubscription,
  resolveEffectiveSubscriptionTier,
} from "@/lib/product/manual-payment";

describe("manual payment product contract", () => {
  it("does not open payment collection without a safe QR configuration", () => {
    assert.equal(getManualPaymentConfig({}).enabled, false);
    assert.equal(getManualPaymentConfig({ MANUAL_PAYMENT_QR_IMAGE_URL: "javascript:alert(1)" }).enabled, false);
  });

  it("exposes the configured QR only through the authenticated payment flow", () => {
    const config = getManualPaymentConfig({
      MANUAL_PAYMENT_QR_IMAGE_URL: "https://payments.example.com/teach-player-qr.png",
      MANUAL_PAYMENT_RECEIVER_HINT: "支付宝 · 账号尾号 1234",
    });

    assert.deepEqual(config, {
      enabled: true,
      qrImageUrl: "https://payments.example.com/teach-player-qr.png",
      receiverHint: "支付宝 · 账号尾号 1234",
    });
  });

  it("snapshots the confirmed 30-day plans at submission time", () => {
    assert.deepEqual(getPlanOrderSnapshot("pro"), {
      tier: "pro",
      amountCny: 19,
      accessDays: 30,
      analysisLimit: 30,
    });
    assert.deepEqual(getPlanOrderSnapshot("max"), {
      tier: "max",
      amountCny: 59,
      accessDays: 30,
      analysisLimit: 100,
    });
  });

  it("extends access from the later of now and the existing expiry", () => {
    const now = new Date("2026-07-22T00:00:00.000Z");
    assert.equal(
      grantSubscriptionAccess("pro", null, now).toISOString(),
      "2026-08-21T00:00:00.000Z",
    );
    assert.equal(
      grantSubscriptionAccess("max", new Date("2026-08-01T00:00:00.000Z"), now).toISOString(),
      "2026-08-31T00:00:00.000Z",
    );
  });

  it("treats an expired paid tier as free", () => {
    const now = new Date("2026-07-22T00:00:00.000Z");
    assert.equal(hasActiveSubscription("pro", new Date("2026-07-21T23:59:59.000Z"), now), false);
    assert.equal(hasActiveSubscription("max", new Date("2026-07-22T00:00:01.000Z"), now), true);
    assert.equal(resolveEffectiveSubscriptionTier("pro", new Date("2026-07-21T23:59:59.000Z"), now), "free");
    assert.equal(resolveEffectiveSubscriptionTier("max", new Date("2026-07-22T00:00:01.000Z"), now), "max");
  });
});
