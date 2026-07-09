import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { getAppUrl, getStripe } from "@/lib/stripe/server";
import type { SubscriptionTier } from "@/lib/plans";

const TIER_PRICE_MAP: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  max: process.env.STRIPE_MAX_PRICE_ID,
};

const CheckoutRedirectSchema = z
  .string()
  .min(1)
  .max(500)
  .refine(isAllowedCheckoutRedirect, "Checkout redirect URL is not allowed.");

const RequestSchema = z.object({
  tier: z.enum(["pro", "max"] as const satisfies [SubscriptionTier, ...SubscriptionTier[]]).optional(),
  successUrl: CheckoutRedirectSchema.optional(),
  cancelUrl: CheckoutRedirectSchema.optional()
});

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 32 * 1024,
    scope: "stripe-checkout",
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "Sign in before starting checkout.", 401);
  }

  const tier = parsed.data.tier ?? "pro";
  const price = TIER_PRICE_MAP[tier];
  if (!price) {
    return errorResponse("stripe_not_configured", `Stripe price for ${tier} tier is not configured.`, 503);
  }

  try {
    const appUrl = getAppUrl();
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: parsed.data.successUrl ?? `${appUrl}/?checkout=success`,
      cancel_url: parsed.data.cancelUrl ?? `${appUrl}/?checkout=cancelled`,
      metadata: { userId, priceId: price, tier }
    });

    return successResponse({ url: session.url });
  } catch {
    return errorResponse("checkout_failed", "Checkout session could not be created.", 502);
  });
}

function isAllowedCheckoutRedirect(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "teachplayer:") {
      return true;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    return url.origin === new URL(getAppUrl()).origin;
  } catch {
    return false;
  }
}
