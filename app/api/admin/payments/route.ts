import { z } from "zod";
import { clearAiProviderCache } from "@/lib/ai/provider";
import { getTencentUser } from "@/lib/tencent-auth";
import { queryTencent, withTencentTransaction } from "@/lib/tencent-db";
import { canTransitionPayment, type PaymentStatus } from "@/lib/product/payment-state";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { recordAdminAuditEventSafely } from "@/lib/product/admin-audit";

const UpdateSchema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

const statusSchema = z.enum(["pending", "approved", "rejected", "all"]);

export async function GET(request: Request) {
  const admin = await getTencentUser(request);
  if (!admin) return errorResponse("unauthorized", "请先登录。", 401);
  if (admin.role !== "admin") return errorResponse("forbidden", "仅管理员可访问。", 403);

  const requestedStatus = statusSchema.safeParse(new URL(request.url).searchParams.get("status") ?? "pending");
  if (!requestedStatus.success) return errorResponse("invalid_status", "付款状态无效。", 400);

  const values = requestedStatus.data === "all" ? [] : [requestedStatus.data];
  const statusFilter = requestedStatus.data === "all" ? "" : "WHERE p.status = $1";
  const result = await queryTencent<{
    id: string; user_id: string; tier: "pro" | "max"; transaction_id: string; status: PaymentStatus;
    reviewed_by: string | null; admin_notes: string | null; created_at: Date; reviewed_at: Date | null; user_email: string | null;
  }>(
    `SELECT p.*, u.email AS user_email FROM payment_submissions p
     LEFT JOIN app_users u ON u.id = p.user_id ${statusFilter} ORDER BY p.created_at DESC`,
    values,
  );

  return successResponse({ submissions: result.rows.map((row) => ({
    ...row,
    created_at: row.created_at.toISOString(),
    reviewed_at: row.reviewed_at?.toISOString() ?? null,
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
        status: PaymentStatus;
      }>(
        `SELECT user_id, tier, status FROM payment_submissions WHERE id = $1 FOR UPDATE`,
        [parsed.data.submissionId],
      );
      const submission = submissionResult.rows[0];
      if (!submission) throw new Error("payment_not_found");

      const nextStatus: PaymentStatus = parsed.data.action === "approve" ? "approved" : "rejected";
      if (!canTransitionPayment(submission.status, nextStatus)) {
        throw new Error("payment_already_reviewed");
      }

      await client.query(
        `UPDATE payment_submissions SET status = $1, reviewed_by = $2, admin_notes = $3, reviewed_at = NOW() WHERE id = $4`,
        [nextStatus, admin.id, parsed.data.notes ?? null, parsed.data.submissionId],
      );
      if (nextStatus === "approved") {
        await client.query(`UPDATE app_users SET subscription_tier = $1 WHERE id = $2`, [submission.tier, submission.user_id]);
      }
      return nextStatus;
    }).catch((error) => {
      if (error instanceof Error && error.message === "payment_not_found") return null;
      if (error instanceof Error && error.message === "payment_already_reviewed") return "already_reviewed" as const;
      throw error;
    });
    if (status === null) return errorResponse("not_found", "提交记录不存在。", 404);
    if (status === "already_reviewed") return errorResponse("already_reviewed", "该提交已被审核。", 400);
    if (status === "approved") clearAiProviderCache();

    await recordAdminAuditEventSafely(admin.id, {
      action: "payment_reviewed",
      targetType: "payment",
      targetId: parsed.data.submissionId,
    });

    return successResponse({ ok: true, status });
  });
}
