import { z } from "zod";
import { getTencentUser } from "@/lib/tencent-auth";
import { queryTencent, withTencentTransaction } from "@/lib/tencent-db";
import { getRefundEligibility } from "@/lib/product/refund-policy";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

const RequestSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

const security = {
  allowedMethods: ["GET", "POST"],
  maxBodySize: 8 * 1024,
  scope: "payment-refund-request",
  rateLimit: { maxRequests: 8, windowMs: 60_000 },
};

type RefundablePayment = {
  id: string;
  tier: "pro" | "max";
  status: "approved" | "refunded";
  amount_cny: number | null;
  reviewed_at: Date | null;
  refund_requested_at: Date | null;
  refunded_at: Date | null;
};

async function getLatestRefundablePayment(userId: string) {
  return queryTencent<RefundablePayment>(
    `SELECT id, tier, status, amount_cny, reviewed_at, refund_requested_at, refunded_at
     FROM payment_submissions
     WHERE user_id = $1 AND status IN ('approved', 'refunded')
     ORDER BY CASE WHEN status = 'approved' THEN 0 ELSE 1 END, reviewed_at DESC NULLS LAST LIMIT 1`,
    [userId],
  );
}

export async function GET(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);

    const payment = (await getLatestRefundablePayment(user.id)).rows[0];
    if (!payment) return successResponse({ refund: null });
    const analysisCount = payment.status === "approved" && payment.reviewed_at
      ? Number((await queryTencent<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM user_videos WHERE user_id = $1 AND created_at >= $2`,
        [user.id, payment.reviewed_at],
      )).rows[0]?.count ?? 0)
      : 0;
    const eligibility = getRefundEligibility({
      status: payment.status,
      approvedAt: payment.reviewed_at,
      analysisCount,
      refundRequestedAt: payment.refund_requested_at,
    });
    return successResponse({
      refund: {
        paymentId: payment.id,
        tier: payment.tier,
        amountCny: payment.amount_cny,
        requestedAt: payment.refund_requested_at?.toISOString() ?? null,
        refundedAt: payment.refunded_at?.toISOString() ?? null,
        eligibility,
      },
    });
  });
}

export async function POST(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);
    const parsed = await readJson(request, RequestSchema);
    if (!parsed.ok) return parsed.response;

    const outcome = await withTencentTransaction(async (client) => {
      const payment = (await client.query<RefundablePayment>(
        `SELECT id, tier, status, amount_cny, reviewed_at, refund_requested_at, refunded_at
         FROM payment_submissions
         WHERE user_id = $1 AND status = 'approved'
         ORDER BY reviewed_at DESC NULLS LAST LIMIT 1 FOR UPDATE`,
        [user.id],
      )).rows[0];
      if (!payment) return { kind: "not_found" as const };
      const analysisCount = payment.reviewed_at
        ? Number((await client.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM user_videos WHERE user_id = $1 AND created_at >= $2`,
          [user.id, payment.reviewed_at],
        )).rows[0]?.count ?? 0)
        : 0;
      const eligibility = getRefundEligibility({
        status: payment.status,
        approvedAt: payment.reviewed_at,
        analysisCount,
        refundRequestedAt: payment.refund_requested_at,
      });
      if (!eligibility.eligible) return { kind: "ineligible" as const, reason: eligibility.reason };

      await client.query(
        `UPDATE payment_submissions SET refund_requested_at = NOW(), refund_reason = $1 WHERE id = $2`,
        [parsed.data.reason || null, payment.id],
      );
      return { kind: "requested" as const };
    });

    if (outcome.kind === "not_found") return errorResponse("refund_not_found", "当前没有可申请退款的已开通订单。", 404);
    if (outcome.kind === "ineligible") return errorResponse("refund_ineligible", "该订单当前不符合退款条件。", 409, { reason: outcome.reason });
    return successResponse({ ok: true, status: "requested" });
  });
}
