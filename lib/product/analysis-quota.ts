import { getPlanConfig, type SubscriptionTier } from "@/lib/plans";

export type AnalysisQuota = {
  allowed: boolean;
  tier: SubscriptionTier;
  totalLimit: number;
  totalUsed: number;
  startsAt: Date | null;
};

/**
 * Usage is measured per unique video. Free usage is lifetime-bounded; a paid
 * order starts a fresh allowance window when its manual review is approved.
 */
export function buildAnalysisQuota(
  tier: SubscriptionTier,
  totalUsed: number,
  startsAt: Date | null,
): AnalysisQuota {
  const plan = getPlanConfig(tier);
  return {
    allowed: totalUsed < plan.analysisLimit,
    tier,
    totalLimit: plan.analysisLimit,
    totalUsed,
    startsAt: tier === "free" ? null : startsAt,
  };
}
