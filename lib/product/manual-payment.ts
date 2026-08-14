import { getPlanConfig, type SubscriptionTier } from "@/lib/plans";

export type PaidSubscriptionTier = Exclude<SubscriptionTier, "free">;

export type ManualPaymentConfig = {
  enabled: boolean;
  qrImageUrl?: string;
  receiverHint?: string;
};

export type PlanOrderSnapshot = {
  tier: PaidSubscriptionTier;
  amountCny: number;
  accessDays: number;
  analysisLimit: number;
};

function isSafeQrImageUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return process.env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost";
  } catch {
    return false;
  }
}

/**
 * The QR is an operator-managed configuration, never a bundled asset or a
 * client-provided URL. This function only exposes a vetted HTTPS URL after
 * the caller has authenticated the user.
 */
export function getManualPaymentConfig(env: Record<string, string | undefined> = process.env): ManualPaymentConfig {
  const qrImageUrl = env.MANUAL_PAYMENT_QR_IMAGE_URL?.trim();
  if (!isSafeQrImageUrl(qrImageUrl)) return { enabled: false };

  const receiverHint = env.MANUAL_PAYMENT_RECEIVER_HINT?.trim().slice(0, 80);
  return {
    enabled: true,
    qrImageUrl,
    ...(receiverHint ? { receiverHint } : {}),
  };
}

export function getPlanOrderSnapshot(tier: PaidSubscriptionTier): PlanOrderSnapshot {
  const plan = getPlanConfig(tier);
  return {
    tier,
    amountCny: plan.price,
    accessDays: plan.accessDays,
    analysisLimit: plan.analysisLimit,
  };
}

export function grantSubscriptionAccess(
  tier: PaidSubscriptionTier,
  existingExpiry: Date | null,
  now = new Date(),
): Date {
  const start = existingExpiry && existingExpiry > now ? existingExpiry : now;
  const expiresAt = new Date(start);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + getPlanConfig(tier).accessDays);
  return expiresAt;
}

export function hasActiveSubscription(
  tier: SubscriptionTier,
  expiresAt: Date | null,
  now = new Date(),
): tier is PaidSubscriptionTier {
  return tier !== "free" && Boolean(expiresAt && expiresAt > now);
}

export function resolveEffectiveSubscriptionTier(
  tier: SubscriptionTier,
  expiresAt: Date | null,
  now = new Date(),
): SubscriptionTier {
  return hasActiveSubscription(tier, expiresAt, now) ? tier : "free";
}
