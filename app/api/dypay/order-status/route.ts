import { getTencentUser } from "@/lib/tencent-auth";
import { queryTencent } from "@/lib/tencent-db";
import { getPlanConfig, type SubscriptionTier } from "@/lib/plans";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, successResponse } from "@/lib/utils/api";
import { isDyPayConfigured, nativePrepay, queryOrderByOutTradeNo, toRfc3339Plus8 } from "@/lib/dypay/server";
import { fulfillPaidOrder, type PaymentOrderRow } from "@/lib/dypay/fulfill";

/** code_url 有效期约 2 分钟，超过 100 秒自动换取新的 */
const CODE_URL_REFRESH_MS = 100 * 1000;
/** 主动查单限频间隔 */
const REMOTE_VERIFY_INTERVAL_MS = 10 * 1000;

const security = {
  allowedMethods: ["GET"],
  scope: "dypay-status",
  rateLimit: { maxRequests: 60, windowMs: 60_000 },
};

export async function GET(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);

    const orderId = new URL(request.url).searchParams.get("orderId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      return errorResponse("invalid_order_id", "Invalid orderId.", 400);
    }

    const result = await queryTencent<PaymentOrderRow>(
      `SELECT * FROM payment_orders WHERE id = $1 AND user_id = $2`,
      [orderId, user.id],
    );
    const order = result.rows[0];
    if (!order) return errorResponse("order_not_found", "订单不存在。", 404);

    // 已支付：返回订阅到期时间
    if (order.status === "paid") {
      const profile = await queryTencent<{ subscription_expires_at: Date | null }>(
        `SELECT subscription_expires_at FROM app_users WHERE id = $1`,
        [user.id],
      );
      return successResponse({
        status: "paid",
        tier: order.tier,
        subscriptionExpiresAt: profile.rows[0]?.subscription_expires_at?.toISOString() ?? null,
      });
    }
    if (order.status === "expired") {
      return successResponse({ status: "expired" });
    }

    // 订单超时未支付 → 置为 expired
    if (new Date(order.time_expire).getTime() <= Date.now()) {
      await queryTencent(
        `UPDATE payment_orders SET status = 'expired', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'`,
        [order.id],
      );
      return successResponse({ status: "expired" });
    }

    // 回调可能丢失：超过限频间隔时主动查单兜底
    const lastVerifiedMs = order.last_verified_at ? new Date(order.last_verified_at).getTime() : 0;
    if (isDyPayConfigured() && Date.now() - lastVerifiedMs > REMOTE_VERIFY_INTERVAL_MS) {
      await queryTencent(
        `UPDATE payment_orders SET last_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [order.id],
      );
      const remote = await queryOrderByOutTradeNo(order.out_trade_no);
      if (remote?.tradeState === "SUCCESS" && remote.amountTotal === order.amount_total) {
        const fulfill = await fulfillPaidOrder(order, remote.transactionId);
        let expiresAt = fulfill.expiresAt?.toISOString() ?? null;
        if (!fulfill.fulfilled) {
          // 并发命中（webhook 已处理过）→ 读一次当前到期时间
          const profile = await queryTencent<{ subscription_expires_at: Date | null }>(
            `SELECT subscription_expires_at FROM app_users WHERE id = $1`,
            [user.id],
          );
          expiresAt = profile.rows[0]?.subscription_expires_at?.toISOString() ?? null;
        }
        return successResponse({
          status: "paid",
          tier: order.tier,
          subscriptionExpiresAt: expiresAt,
        });
      }
      if (remote?.tradeState === "CLOSED") {
        await queryTencent(
          `UPDATE payment_orders SET status = 'expired', updated_at = NOW()
           WHERE id = $1 AND status = 'pending'`,
          [order.id],
        );
        return successResponse({ status: "expired" });
      }
    }

    // code_url 过期 → 用相同参数重新下单换取新链接（官方允许）
    const codeUrlAgeMs = order.code_url_generated_at
      ? Date.now() - new Date(order.code_url_generated_at).getTime()
      : Infinity;
    let codeUrl = order.code_url;
    if (isDyPayConfigured() && (!codeUrl || codeUrlAgeMs > CODE_URL_REFRESH_MS)) {
      const plan = getPlanConfig(order.tier satisfies SubscriptionTier);
      const prepay = await nativePrepay({
        outTradeNo: order.out_trade_no,
        description: `Teach Player ${plan.nameZh}（${plan.accessDays} 天）`,
        amountTotal: order.amount_total,
        notifyUrl: process.env.DYPAY_NOTIFY_URL?.trim()
          || `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://teachplayer.tpgofighting.top"}/api/dypay/webhook`,
        timeExpire: toRfc3339Plus8(new Date(order.time_expire)),
        attach: JSON.stringify({ tier: order.tier, user_id: order.user_id }),
      });
      codeUrl = prepay.codeUrl;
      await queryTencent(
        `UPDATE payment_orders
         SET code_url = $1, code_url_generated_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [codeUrl, order.id],
      );
    }

    return successResponse({ status: "pending", codeUrl: codeUrl ?? null });
  });
}
