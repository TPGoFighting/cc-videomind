import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_DELETION_CONFIRMATION_TEXT,
  ACCOUNT_DELETION_SCOPE,
  AccountDeletionRequestSchema,
  canCancelAccountDeletion,
  getAccountDeletionProcessAfter,
} from "./account-deletion";

describe("account deletion contract", () => {
  it("requires the exact confirmation phrase and a password", () => {
    assert.equal(AccountDeletionRequestSchema.safeParse({
      password: "valid-password",
      confirmation: ACCOUNT_DELETION_CONFIRMATION_TEXT,
    }).success, true);
    assert.equal(AccountDeletionRequestSchema.safeParse({
      password: "valid-password",
      confirmation: "delete",
    }).success, false);
  });

  it("provides a seven-day cancellation window", () => {
    const requestedAt = new Date("2026-07-22T00:00:00.000Z");
    const processAfter = getAccountDeletionProcessAfter(requestedAt);
    assert.equal(processAfter.toISOString(), "2026-07-29T00:00:00.000Z");
    assert.equal(canCancelAccountDeletion({ status: "pending", processAfter, now: requestedAt }), true);
    assert.equal(canCancelAccountDeletion({ status: "processing", processAfter, now: requestedAt }), false);
    assert.equal(canCancelAccountDeletion({ status: "pending", processAfter, now: processAfter }), false);
  });

  it("states both deletion scope and retention exceptions", () => {
    assert.ok(ACCOUNT_DELETION_SCOPE.deletes.length >= 3);
    assert.ok(ACCOUNT_DELETION_SCOPE.retains.length >= 2);
  });
});
