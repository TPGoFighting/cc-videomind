import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getTencentUser } from "@/lib/tencent-auth";
import { queryTencent } from "@/lib/tencent-db";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

const SubmitSchema = z.object({
  tier: z.enum(["pro", "max"]),
  transactionId: z.string().trim().min(1).max(100),
});

const security = {
  allowedMethods: ["GET", "POST"],
  maxBodySize: 16 * 1024,
  scope: "payment-submit",
  rateLimit: { maxRequests: 20, windowMs: 60_000 },
};

export async function GET(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);

    const result = await queryTencent<{ tier: "pro" | "max"; status: "pending"; created_at: Date }>(
      `SELECT tier, status, created_at FROM payment_submissions
       WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [user.id],
    );
    const pending = result.rows[0];
    return successResponse({
      pending: pending ? { tier: pending.tier, status: pending.status, createdAt: pending.created_at.toISOString() } : null,
    });
  });
}

export async function POST(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);

    const parsed = await readJson(request, SubmitSchema);
    if (!parsed.ok) return parsed.response;

    const existing = await queryTencent<{ id: string }>(
      `SELECT id FROM payment_submissions WHERE user_id = $1 AND tier = $2 AND status = 'pending' LIMIT 1`,
      [user.id, parsed.data.tier],
    );
    if (existing.rowCount) {
      return errorResponse("pending_submission_exists", "该套餐已有待审核付款提交。", 409);
    }

    await queryTencent(
      `INSERT INTO payment_submissions (id, user_id, tier, transaction_id) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), user.id, parsed.data.tier, parsed.data.transactionId],
    );
    return successResponse({ ok: true });
  });
}
