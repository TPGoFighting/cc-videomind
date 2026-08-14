import { randomUUID } from "node:crypto";
import { z } from "zod";
import { queryTencent } from "@/lib/tencent-db";

export const AdminAuditEventSchema = z.object({
  action: z.enum([
    "metrics_viewed",
    "settings_updated",
    "payment_reviewed",
    "user_lookup",
    "videos_viewed",
    "account_deletion_worker_run",
  ]),
  targetType: z.enum(["metrics", "setting", "payment", "user", "video", "account_deletion_batch"]),
  targetId: z.string().min(1).max(160).regex(/^[a-zA-Z0-9._:/-]+$/).optional(),
}).strict();

export type AdminAuditEvent = z.infer<typeof AdminAuditEventSchema>;

export async function recordAdminAuditEvent(actorUserId: string | null, input: AdminAuditEvent): Promise<void> {
  const event = AdminAuditEventSchema.parse(input);
  await queryTencent(
    `INSERT INTO admin_audit_events (id, actor_user_id, action, target_type, target_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '365 days')`,
    [randomUUID(), actorUserId, event.action, event.targetType, event.targetId ?? null],
  );
}

export async function recordAdminAuditEventSafely(actorUserId: string | null, input: AdminAuditEvent): Promise<void> {
  try {
    await recordAdminAuditEvent(actorUserId, input);
  } catch {
    console.warn(`[AdminAudit] ${input.action} was not recorded.`);
  }
}
