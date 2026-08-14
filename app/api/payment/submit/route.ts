import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getTencentUser } from "@/lib/tencent-auth";
import { queryTencent } from "@/lib/tencent-db";
import { getManualPaymentConfig, getPlanOrderSnapshot } from "@/lib/product/manual-payment";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

const SubmitSchema = z.object({
  tier: z.enum(["pro", "max"]),
  transactionId: z.string().trim().min(6).max(100).regex(/^[A-Za-z0-9_-]+$/),
  acceptedTerms: z.literal(true),
});

const security = {
  allowedMethods: ["GET", "POST", "DELETE"],
  maxBodySize: 16 * 1024,
  scope: "payment-submit",
  rateLimit: { maxRequests: 20, windowMs: 60_000 },
};

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "23505";
}

export async function GET(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);

    const result = await queryTencent<{
      tier: "pro" | "max"; status: "pending"; created_at: Date; amount_cny: number | null; access_days: number | null;
    }>(
      `SELECT tier, status, created_at, amount_cny, access_days FROM payment_submissions
       WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [user.id],
    );
    const pending = result.rows[0];
    const config = getManualPaymentConfig();
    return successResponse({
      manualPayment: config.enabled ? {
        available: true,
        qrImageUrl: config.qrImageUrl,
        receiverHint: config.receiverHint ?? null,
      } : { available: false },
      plans: [getPlanOrderSnapshot("pro"), getPlanOrderSnapshot("max")],
      currentSubscription: {
        tier: user.subscriptionTier,
        expiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
      },
      pending: pending ? {
        tier: pending.tier,
        status: pending.status,
        amountCny: pending.amount_cny ?? getPlanOrderSnapshot(pending.tier).amountCny,
        accessDays: pending.access_days ?? getPlanOrderSnapshot(pending.tier).accessDays,
        createdAt: pending.created_at.toISOString(),
      } : null,
    });
  });
}

export async function POST(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);
    if (!getManualPaymentConfig().enabled) {
      return errorResponse("manual_payment_unavailable", "当前不接受新的人工付款申请。", 409);
    }

    const parsed = await readJson(request, SubmitSchema);
    if (!parsed.ok) return parsed.response;

    const existing = await queryTencent<{ id: string; tier: "pro" | "max" }>(
      `SELECT id, tier FROM payment_submissions WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
      [user.id],
    );
    if (existing.rowCount) {
      return errorResponse("pending_submission_exists", "你已有一笔待审核付款提交，请等待审核或取消后再提交。", 409);
    }

    const snapshot = getPlanOrderSnapshot(parsed.data.tier);
    try {
      await queryTencent(
        `INSERT INTO payment_submissions (id, user_id, tier, transaction_id, amount_cny, access_days)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), user.id, parsed.data.tier, parsed.data.transactionId, snapshot.amountCny, snapshot.accessDays],
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        return errorResponse("pending_submission_exists", "你已有一笔待审核付款提交，请等待审核或取消后再提交。", 409);
      }
      throw error;
    }
    return successResponse({ ok: true });
  });
}

export async function DELETE(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);

    const result = await queryTencent<{ id: string }>(
      `UPDATE payment_submissions SET status = 'cancelled', reviewed_at = NOW()
       WHERE user_id = $1 AND status = 'pending' RETURNING id`,
      [user.id],
    );
    if (!result.rowCount) return errorResponse("pending_submission_not_found", "没有可取消的待审核付款申请。", 404);
    return successResponse({ ok: true });
  });
}
