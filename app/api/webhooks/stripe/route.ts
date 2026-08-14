import { withSecurity } from "@/lib/security/middleware";
import { errorResponse } from "@/lib/utils/api";

/** Stripe is not an active payment authority in the D3 launch architecture. */
export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    skipCsrf: true,
    maxBodySize: 256_000,
    scope: "stripe-webhook-disabled",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => errorResponse(
    "payment_method_disabled",
    "Stripe webhook is disabled for the current launch payment method.",
    410,
  ));
}
