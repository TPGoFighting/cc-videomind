import { z } from "zod";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAppUrl, getStripe } from "@/lib/stripe/server";

const RequestSchema = z.object({
  priceId: z.string().min(1).optional()
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request, "stripe-checkout"), 5, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many checkout attempts. Try again shortly.", 429);
  }

  const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return errorResponse("unauthorized", "Sign in before starting checkout.", 401);
  }

  const price = parsed.data.priceId ?? process.env.STRIPE_PRO_PRICE_ID;
  if (!price) {
    return errorResponse("stripe_not_configured", "Stripe price is not configured.", 503);
  }

  try {
    const appUrl = getAppUrl();
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
      metadata: { userId }
    });

    return successResponse({ url: session.url });
  } catch {
    return errorResponse("checkout_failed", "Checkout session could not be created.", 502);
  }
}
