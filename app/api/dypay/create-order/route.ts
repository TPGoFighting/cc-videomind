import { z } from "zod";
import { getTencentUser } from "@/lib/tencent-auth";
import { queryTencent } from "@/lib/tencent-db";
import { hasActiveSubscription } from "@/lib/product/manual-payment";
import { getPlanConfig, type SubscriptionTier } from "@/lib/plans";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { generateOutTradeNo, isDyPayConfigured, nativePrepay, toRfc3339Plus8 } from "@/lib/dypay/server";
import { generateOrderId, type PaymentOrderRow } from "@/lib/dypay/fulfill";

const CreateOrderSchema = z.object({
  tier: z.enum(["pro", "max"]),
});

const security = {
  allowedMethods: ["POST"],
  maxBodySize: 4 * 1024,
  scope: "dypay-order",
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
};

export async function POST(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录后再购买。", 401);

    if (!isDyPayConfigured()) {
      return errorResponse("dypay_not_configured", "在线支付未配置，请使用人工转账通道。", 503);
    }

    const parsed = await readJson(request, CreateOrderSchema);
    if (!parsed.ok) return parsed.response;
    const { tier } = parsed.data;

    const plan = getPlanConfig(tier satisfies SubscriptionTier);
    const amountTotal = plan.price * 100;

    // 已有有效订阅时不允许重复下单（避免重复扣费客诉）
    const currentTier = user.subscriptionTier as SubscriptionTier;
    if (hasActiveSubscription(currentTier, user.subscriptionExpiresAt)) {
      return errorResponse(
        "already_subscribed",
        `你已有${getPlanConfig(currentTier).nameZh}订阅，到期后将自动降级，无需重复购买。`,
        409,
        { subscription_expires_at: user.subscriptionExpiresAt?.toISOString() ?? null },
      );
    }

    // 复用 15 分钟内未支付的同档位订单（防重复下单堆单）
    const pendingResult = await queryTencent<PaymentOrderRow>(
      `SELECT * FROM payment_orders
       WHERE user_id = $1 AND tier = $2 AND status = 'pending' AND time_expire > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, tier],
    );
    let order = pendingResult.rows[0] ?? null;

    if (!order) {
      const inserted = await queryTencent<PaymentOrderRow>(
        // ORDER_VALID_MINUTES 编译期常量（15），非用户输入
        `INSERT INTO payment_orders (id, user_id, out_trade_no, tier, amount_total, provider, time_expire)
         VALUES ($1, $2, $3, $4, $5, 'dypay', NOW() + interval '15 minutes')
         RETURNING *`,
        [generateOrderId(), user.id, generateOutTradeNo(), tier, amountTotal],
      );
      order = inserted.rows[0];
    }

    // Native 下单获取二维码链接（同一 out_trade_no + 相同参数可重复调用换取新 code_url）
    const prepay = await nativePrepay({
      outTradeNo: order.out_trade_no,
      description: `Teach Player ${plan.nameZh}（${plan.accessDays} 天）`,
      amountTotal: order.amount_total,
      notifyUrl: process.env.DYPAY_NOTIFY_URL?.trim()
        || `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://teachplayer.tpgofighting.top"}/api/dypay/webhook`,
      timeExpire: toRfc3339Plus8(new Date(order.time_expire)),
      attach: JSON.stringify({ tier, user_id: user.id }),
    });

    await queryTencent(
      `UPDATE payment_orders
       SET code_url = $1, code_url_generated_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [prepay.codeUrl, order.id],
    );

    return successResponse({
      orderId: order.id,
      codeUrl: prepay.codeUrl,
      amountTotal: order.amount_total,
      tier: order.tier,
      timeExpire: new Date(order.time_expire).toISOString(),
    });
  });
}
