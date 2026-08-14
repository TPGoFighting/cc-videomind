import {
  getTencentBearerToken,
  getTencentUser,
  type TencentUser,
} from "@/lib/tencent-auth";
import { queryTencent, withTencentTransaction } from "@/lib/tencent-db";
import { isLocalMode } from "@/lib/local-mode";
import { buildAnalysisQuota } from "@/lib/product/analysis-quota";
import { resolveEffectiveSubscriptionTier } from "@/lib/product/manual-payment";
import { type SubscriptionTier } from "@/lib/plans";

/** LOCAL_MODE 下的固定本地用户 id */
export const LOCAL_USER_ID = "local";
export type { SubscriptionTier };

export const getBearerToken = getTencentBearerToken;

export async function getAuthenticatedUser(request?: Request): Promise<TencentUser | null> {
  if (isLocalMode()) {
    return { id: LOCAL_USER_ID, email: "local@local", role: "user", subscriptionTier: "free", subscriptionExpiresAt: null, subscriptionUsageStartedAt: null };
  }
  return getTencentUser(request);
}

export async function getAuthenticatedUserId(request?: Request): Promise<string | null> {
  return (await getAuthenticatedUser(request))?.id ?? null;
}

export async function getProfileTier(userId: string): Promise<SubscriptionTier> {
  const user = await getAuthenticatedUser();
  return user?.id === userId && (user.subscriptionTier === "pro" || user.subscriptionTier === "max")
    ? user.subscriptionTier
    : "free";
}

export async function hasUserAnalyzedVideo(userId: string | null, videoId: string, _request?: Request): Promise<boolean> {
  void _request;
  if (isLocalMode() || !userId) return false;
  const result = await queryTencent<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM user_videos WHERE user_id = $1 AND video_id = $2) AS exists`,
    [userId, videoId],
  );
  return result.rows[0]?.exists ?? false;
}

/** Enforces the same plan limits used by the payment page for logged-in users. */
export async function checkAnalysisQuota(userId: string | null, request?: Request) {
  if (isLocalMode()) {
    return { ...buildAnalysisQuota("free", 0, null), anonymous: !userId, limit: 3, used: 0 };
  }
  const user = await getAuthenticatedUser(request);
  if (!userId || !user || user.id !== userId) {
    // Anonymous exploration remains available, but it never represents an
    // account plan and cannot unlock paid entitlement.
    return { allowed: true, anonymous: true, limit: 1, used: 0, tier: "free" as const, totalLimit: 1, totalUsed: 0, startsAt: null };
  }
  const startsAt = user.subscriptionTier === "free" ? null : user.subscriptionUsageStartedAt;
  const result = await queryTencent<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM user_videos
     WHERE user_id = $1 AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)`,
    [user.id, startsAt],
  );
  const quota = buildAnalysisQuota(user.subscriptionTier as SubscriptionTier, Number(result.rows[0]?.count ?? 0), startsAt);
  return {
    ...quota,
    anonymous: false,
    limit: quota.totalLimit,
    used: quota.totalUsed,
  };
}

export async function recordAnalysisUsage(input: { userId: string | null; videoId: string; request?: Request }) {
  if (isLocalMode() || !input.userId) return { recorded: true, quota: null };
  await queryTencent(
    `INSERT INTO video_analyses (video_id) VALUES ($1) ON CONFLICT (video_id) DO NOTHING`,
    [input.videoId],
  );
  return withTencentTransaction(async (client) => {
    const userResult = await client.query<{
      subscription_tier: SubscriptionTier;
      subscription_expires_at: Date | string | null;
      subscription_usage_started_at: Date | string | null;
    }>(
      `SELECT subscription_tier, subscription_expires_at, subscription_usage_started_at
       FROM app_users WHERE id = $1 FOR UPDATE`,
      [input.userId],
    );
    const user = userResult.rows[0];
    if (!user) return { recorded: false, quota: null };

    const expiresAt = user.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
    const tier = resolveEffectiveSubscriptionTier(user.subscription_tier, expiresAt);
    const startsAt = tier === "free" ? null : (user.subscription_usage_started_at ? new Date(user.subscription_usage_started_at) : null);
    const existing = await client.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM user_videos WHERE user_id = $1 AND video_id = $2) AS exists`,
      [input.userId, input.videoId],
    );
    if (existing.rows[0]?.exists) return { recorded: true, quota: null };

    const usage = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM user_videos
       WHERE user_id = $1 AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)`,
      [input.userId, startsAt],
    );
    const quota = buildAnalysisQuota(tier, Number(usage.rows[0]?.count ?? 0), startsAt);
    if (!quota.allowed) return { recorded: false, quota };

    await client.query(`INSERT INTO user_videos (user_id, video_id) VALUES ($1, $2)`, [input.userId, input.videoId]);
    return { recorded: true, quota: { ...quota, totalUsed: quota.totalUsed + 1 } };
  });
}
