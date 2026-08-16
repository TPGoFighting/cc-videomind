/**
 * 支付履约：订单置为 paid + 延长 app_users 订阅（按订单 tier 的 accessDays）
 * 通过「条件更新赢得竞争」保证 webhook 与主动查单并发下的幂等。
 */

import { randomUUID } from "node:crypto";
import { withTencentTransaction } from "@/lib/tencent-db";
import { grantSubscriptionAccess, type PaidSubscriptionTier } from "@/lib/product/manual-payment";
import { getPlanConfig } from "@/lib/plans";

export interface PaymentOrderRow {
  id: string;
  user_id: string;
  out_trade_no: string;
  tier: "pro" | "max";
  amount_total: number;
  status: string;
  provider: string;
  transaction_id: string | null;
  code_url: string | null;
  code_url_generated_at: Date | null;
  last_verified_at: Date | null;
  paid_at: Date | null;
  time_expire: Date;
  created_at: Date;
}

export interface FulfillResult {
  /** 首次履约成功；false 表示已被并发请求处理过（幂等命中） */
  fulfilled: boolean;
  /** 履约后的订阅到期时间 */
  expiresAt?: Date;
}

/**
 * 将订单标记为已支付并延长用户订阅（单事务）：
 * 1) `UPDATE ... WHERE status='pending' RETURNING` 原子赢得履约权
 * 2) 读当前到期时间，未过期则顺延 accessDays 天
 */
export async function fulfillPaidOrder(
  order: Pick<PaymentOrderRow, "id" | "user_id" | "tier">,
  transactionId?: string
): Promise<FulfillResult> {
  return withTencentTransaction(async (client) => {
    const updated = await client.query<{ id: string }>(
      `UPDATE payment_orders
       SET status = 'paid', paid_at = NOW(), updated_at = NOW(),
           transaction_id = COALESCE($1, transaction_id)
       WHERE id = $2 AND status = 'pending'
       RETURNING id`,
      [transactionId ?? null, order.id],
    );
    if (!updated.rowCount) return { fulfilled: false };

    const userResult = await client.query<{ subscription_expires_at: Date | null }>(
      `SELECT subscription_expires_at FROM app_users WHERE id = $1`,
      [order.user_id],
    );
    const currentExpiry = userResult.rows[0]?.subscription_expires_at ?? null;
    const expiresAt = grantSubscriptionAccess(
      order.tier satisfies PaidSubscriptionTier,
      currentExpiry ? new Date(currentExpiry) : null,
    );

    await client.query(
      `UPDATE app_users
       SET subscription_tier = $1,
           subscription_expires_at = $2,
           subscription_payment_id = $3
       WHERE id = $4`,
      [order.tier, expiresAt, order.id, order.user_id],
    );

    return { fulfilled: true, expiresAt };
  });
}

/** 判断该订单档位单次购买的时长与金额是否与环境配置一致（下单快照用） */
export function getOrderSnapshot(tier: "pro" | "max") {
  const plan = getPlanConfig(tier);
  return { tier, amountTotal: plan.price * 100, accessDays: plan.accessDays };
}

/** 生成订单主键（与其他 tencent 表一致：TEXT 显式 UUID） */
export function generateOrderId(): string {
  return randomUUID();
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "23505";
}
