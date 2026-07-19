import Stripe from "stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/utils/api";
import { getStripe } from "@/lib/stripe/server";
import type { SubscriptionTier } from "@/lib/plans";
import { withSecurity } from "@/lib/security/middleware";

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;
const MAX_PRICE_ID = process.env.STRIPE_MAX_PRICE_ID;

function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (MAX_PRICE_ID && priceId === MAX_PRICE_ID) return "max";
  if (PRO_PRICE_ID && priceId === PRO_PRICE_ID) return "pro";
  return "free";
}

// 关键：阻止 Next.js 解析 body，Stripe 需要原始 body 做签名验证
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    skipCsrf: true,
    maxBodySize: 256_000,
  }).wrap(request, async () => {
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (contentLength > 256_000) {
        return errorResponse("payload_too_large", "Webhook payload is too large.", 413);
      }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return errorResponse("webhook_not_configured", "Stripe webhook is not configured.", 503);
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return errorResponse("invalid_signature", "Invalid Stripe webhook signature.", 400);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("supabase_not_configured", "Supabase service client is not configured.", 503);
  }

  const { data: existing } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (existing) {
    return successResponse({ received: true, duplicate: true });
  }

  try {
    await handleStripeEvent(event);
    await supabase.from("stripe_events").insert({ id: event.id, type: event.type });
    return successResponse({ received: true, duplicate: false });
  } catch {
    return errorResponse("webhook_processing_failed", "Stripe webhook could not be processed.", 500);
  }
  });
}

async function handleStripeEvent(event: Stripe.Event) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client unavailable.");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (!userId) {
      return;
    }

    const tier = getTierFromPriceId(session.metadata?.priceId ?? "");

    await supabase.from("profiles").upsert({
      id: userId,
      subscription_tier: tier,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripe_subscription_id:
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
      subscription_status: "active",
      updated_at: new Date().toISOString()
    });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const isActive = subscription.status === "active" || subscription.status === "trialing";
    const priceId = subscription.items?.data?.[0]?.price?.id ?? "";

    await supabase
      .from("profiles")
      .update({
        subscription_tier: isActive ? getTierFromPriceId(priceId) : "free",
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq("stripe_customer_id", customerId);
  }
}

