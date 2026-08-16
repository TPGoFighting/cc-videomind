/**
 * 抖音支付回调通知
 *
 * 处理流程（安全红线，缺一不可）：
 * 1. 用平台公钥验证 Douyinpay-Signature（防伪造"假通知"）
 * 2. AES-256-GCM 解密 resource.ciphertext
 * 3. 校验 out_trade_no 存在、amount.total 与本地订单一致（防篡改）
 * 4. 仅 trade_state=SUCCESS 履约；payment_events 按通知 ID 幂等去重
 * 5. 处理成功返回 2xx（空报文）；失败返回 5xx，抖音按 15s/15s/30s/3m/... 重试 24h
 */

import { NextResponse } from "next/server";
import { withSecurity } from "@/lib/security/middleware";
import { queryTencent } from "@/lib/tencent-db";
import { parseDyPayCallback } from "@/lib/dypay/server";
import { fulfillPaidOrder, isUniqueViolation, type PaymentOrderRow } from "@/lib/dypay/fulfill";
import { ExternalServiceError } from "@/lib/utils/http";

interface CallbackOrderData {
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  amount?: { total?: number };
}

function fail(status: number, code: string, message: string) {
  // 非 2xx + 应答报文 → 抖音会重试
  return NextResponse.json({ code, message }, { status });
}

const security = {
  allowedMethods: ["POST"],
  maxBodySize: 16 * 1024,
  skipCsrf: true, // 外部服务端调用，无 Origin；安全性由签名验证保证
};

export async function POST(request: Request) {
  return withSecurity(security).wrap(request, async () => {
    const rawBody = await request.text();

    let callback;
    try {
      callback = await parseDyPayCallback(rawBody, request.headers);
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        console.error("[dypay-webhook] parse failed:", error.message);
        return fail(error.status ?? 500, "PARSE_FAILED", error.message);
      }
      console.error("[dypay-webhook] unexpected error:", error);
      return fail(500, "INTERNAL_ERROR", "callback parse error");
    }

    // 非支付成功通知（如退款等）直接确认收到
    if (callback.eventType !== "TRANSACTION.SUCCESS") {
      console.log("[dypay-webhook] ignore event:", callback.eventType);
      return new NextResponse(null, { status: 200 });
    }

    const orderData = callback.data as CallbackOrderData;
    const outTradeNo = orderData.out_trade_no;
    if (!outTradeNo) {
      console.error("[dypay-webhook] missing out_trade_no");
      return fail(500, "MISSING_OUT_TRADE_NO", "out_trade_no is required");
    }

    const result = await queryTencent<PaymentOrderRow>(
      `SELECT * FROM payment_orders WHERE out_trade_no = $1`,
      [outTradeNo],
    );
    const order = result.rows[0];
    if (!order) {
      console.error("[dypay-webhook] order not found:", outTradeNo);
      return fail(500, "ORDER_NOT_FOUND", `unknown out_trade_no: ${outTradeNo}`);
    }

    // 金额校验：通知金额必须与本地订单完全一致
    const notifiedTotal = orderData.amount?.total;
    if (typeof notifiedTotal !== "number" || notifiedTotal !== order.amount_total) {
      console.error(
        `[dypay-webhook] amount mismatch: notified=${notifiedTotal} expected=${order.amount_total} order=${outTradeNo}`,
      );
      return fail(500, "AMOUNT_MISMATCH", "amount mismatch");
    }

    // 交易状态校验：仅支付成功才履约
    if (orderData.trade_state !== "SUCCESS") {
      console.log("[dypay-webhook] trade_state not SUCCESS:", orderData.trade_state);
      return new NextResponse(null, { status: 200 });
    }

    try {
      await fulfillPaidOrder(order, orderData.transaction_id);
    } catch (error) {
      console.error("[dypay-webhook] fulfill failed:", error);
      return fail(500, "FULFILL_FAILED", "failed to fulfill order");
    }

    // 幂等记录（履约成功后写入；冲突说明是重复推送，直接确认）
    try {
      await queryTencent(
        `INSERT INTO payment_events (id, out_trade_no) VALUES ($1, $2)`,
        [callback.id, outTradeNo],
      );
    } catch (error) {
      if (!isUniqueViolation(error)) {
        console.error("[dypay-webhook] insert event failed:", error);
      }
    }

    console.log(`[dypay-webhook] order paid: ${outTradeNo} tier=${order.tier}`);
    return new NextResponse(null, { status: 200 });
  });
}
