import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdminAuditEventSchema } from "./admin-audit";

describe("admin audit event contract", () => {
  it("accepts identifiers but rejects email and free-form content", () => {
    assert.equal(AdminAuditEventSchema.safeParse({
      action: "payment_reviewed",
      targetType: "payment",
      targetId: "7fc92394-72c4-4d94-b213-1bca44503cff",
    }).success, true);
    assert.equal(AdminAuditEventSchema.safeParse({
      action: "user_lookup",
      targetType: "user",
      targetId: "person@example.com",
    }).success, false);
    assert.equal(AdminAuditEventSchema.safeParse({
      action: "settings_updated",
      targetType: "setting",
      targetId: "api key changed by support",
    }).success, false);
  });
});
