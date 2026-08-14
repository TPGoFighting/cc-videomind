import { z } from "zod";
import { clearAiProviderCache } from "@/lib/ai/provider";
import { getTencentUser } from "@/lib/tencent-auth";
import { queryTencent, withTencentTransaction } from "@/lib/tencent-db";
import { canTransitionPayment, type PaymentStatus } from "@/lib/product/payment-state";
import { getPlanOrderSnapshot } from "@/lib/product/manual-payment";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { recordAdminAuditEventSafely } from "@/lib/product/admin-audit";

const UpdateSchema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(["approve", "reject", "refund"]),
  notes: z.string().max(500).optional(),
});

const statusSchema = z.enum(["pending", "approved", "rejected", "refunded", "all"]);

export async function GET(request: Request) {
  const admin = await getTencentUser(request);
  if (!admin) return errorResponse("unauthorized", "请先登录。", 401);
  if (admin.role !== "admin") return errorResponse("forbidden", "仅管理员可访问。", 403);

  const requestedStatus = statusSchema.safeParse(new URL(request.url).searchParams.get("status") ?? "pending");
  if (!requestedStatus.success) return errorResponse("invalid_status", "付款状态无效。", 400);

  const values = requestedStatus.data === "all" ? [] : [requestedStatus.data];
  const statusFilter = requestedStatus.data === "all" ? "" : "WHERE p.status = $1";
  const result = await queryTencent<{
    id: string; user_id: string; tier: "pro" | "max"; transaction_id: string; amount_cny: number | null; status: PaymentStatus;
    reviewed_by: string | null; admin_notes: string | null; created_at: Date; reviewed_at: Date | null;
    refund_requested_at: Date | null; refund_reason: string | null; refunded_at: Date | null; user_email: string | null;
  }>(
    `SELECT p.*, u.email AS user_email FROM payment_submissions p
     LEFT JOIN app_users u ON u.id = p.user_id ${statusFilter} ORDER BY p.created_at DESC`,
    values,
  );

  return successResponse({ submissions: result.rows.map((row) => ({
    ...row,
    created_at: row.created_at.toISOString(),
    reviewed_at: row.reviewed_at?.toISOString() ?? null,
    refund_requested_at: row.refund_requested_at?.toISOString() ?? null,
    refunded_at: row.refunded_at?.toISOString() ?? null,
    userEmail: row.user_email,
  })) });
}

export async function PUT(request: Request) {
  return withSecurity({
    allowedMethods: ["PUT"],
    maxBodySize: 16 * 1024,
    scope: "admin-payments",
    rateLimit: { maxRequests: 60, windowMs: 60_000 },
  }).wrap(request, async () => {
    const admin = await getTencentUser(request);
    if (!admin || admin.role !== "admin") return errorResponse("forbidden", "仅管理员可访问。", 403);

    const parsed = await readJson(request, UpdateSchema);
    if (!parsed.ok) return parsed.response;

    const status = await withTencentTransaction(async (client) => {
      const submissionResult = await client.query<{
        user_id: string;
        tier: "pro" | "max";
        status: PaymentStatus; access_days: number | null; refund_requested_at: Date | null;
      }>(
        `SELECT user_id, tier, status, access_days, refund_requested_at FROM payment_submissions WHERE id = $1 FOR UPDATE`,
        [parsed.data.submissionId],
      );
      const submission = submissionResult.rows[0];
      if (!submission) throw new Error("payment_not_found");

      const nextStatus: PaymentStatus = parsed.data.action === "approve"
        ? "approved"
        : parsed.data.action === "reject" ? "rejected" : "refunded";
      if (!canTransitionPayment(submission.status, nextStatus)) {
        throw new Error("payment_already_reviewed");
      }
      if (parsed.data.action === "refund" && !submission.refund_requested_at) {
        throw new Error("refund_not_requested");
      }

      await client.query(
        `UPDATE payment_submissions
         SET status = $1, reviewed_by = $2, admin_notes = $3, reviewed_at = NOW(),
             refunded_at = CASE WHEN $1 = 'refunded' THEN NOW() ELSE refunded_at END
         WHERE id = $4`,
        [nextStatus, admin.id, parsed.data.notes ?? null, parsed.data.submissionId],
      );
      if (nextStatus === "approved") {
        const accessDays = submission.access_days ?? getPlanOrderSnapshot(submission.tier).accessDays;
        await client.query(
          `UPDATE app_users
           SET subscription_tier = $1,
               subscription_expires_at = GREATEST(COALESCE(subscription_expires_at, NOW()), NOW()) + ($2::integer * INTERVAL '1 day'),
               subscription_usage_started_at = NOW(),
               subscription_payment_id = $4
           WHERE id = $3`,
          [submission.tier, accessDays, submission.user_id, parsed.data.submissionId],
        );
      }
      if (nextStatus === "refunded") {
        await client.query(
          `UPDATE app_users SET subscription_tier = 'free', subscription_expires_at = NULL,
             subscription_usage_started_at = NULL, subscription_payment_id = NULL
           WHERE id = $1 AND subscription_payment_id = $2`,
          [submission.user_id, parsed.data.submissionId],
        );
      }
      return nextStatus;
    }).catch((error) => {
      if (error instanceof Error && error.message === "payment_not_found") return null;
      if (error instanceof Error && error.message === "payment_already_reviewed") return "already_reviewed" as const;
      if (error instanceof Error && error.message === "refund_not_requested") return "refund_not_requested" as const;
      throw error;
    });
    if (status === null) return errorResponse("not_found", "提交记录不存在。", 404);
    if (status === "already_reviewed") return errorResponse("already_reviewed", "该提交已被审核。", 400);
    if (status === "refund_not_requested") return errorResponse("refund_not_requested", "用户尚未提交退款申请，不能标记为已退款。", 400);
    if (status === "approved") clearAiProviderCache();

    await recordAdminAuditEventSafely(admin.id, {
      action: "payment_reviewed",
      targetType: "payment",
      targetId: parsed.data.submissionId,
    });

    return successResponse({ ok: true, status });
  });
}
