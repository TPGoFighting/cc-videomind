import { withSecurity } from "@/lib/security/middleware";
import { errorResponse } from "@/lib/utils/api";

/**
 * Legacy compatibility endpoint.
 *
 * D3 selects the domestic/manual review flow as the only launch payment path.
 * Old clients receive a permanent, actionable response instead of creating a
 * second source of subscription truth in Stripe.
 */
export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 32 * 1024,
    scope: "stripe-checkout-disabled",
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  }).wrap(request, async () => errorResponse(
    "payment_method_disabled",
    "当前版本仅支持微信或支付宝付款后提交单号审核，请使用站内付款提交入口。",
    410,
  ));
}
