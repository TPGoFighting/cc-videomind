import { getTencentUser, type TencentUser } from "@/lib/tencent-auth";
import { queryTencent } from "@/lib/tencent-db";
import { isLocalMode } from "@/lib/local-mode";
import { type SubscriptionTier } from "@/lib/plans";

/** LOCAL_MODE 下的固定本地用户 id */
export const LOCAL_USER_ID = "local";
export type { SubscriptionTier };

export function getBearerToken(request?: Request) {
  const authorization = request?.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function getAuthenticatedUser(request?: Request): Promise<TencentUser | null> {
  if (isLocalMode()) {
    return { id: LOCAL_USER_ID, email: "local@local", role: "user", subscriptionTier: "free" };
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
  if (isLocalMode() || !userId) return false;
  const result = await queryTencent<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM user_videos WHERE user_id = $1 AND video_id = $2) AS exists`,
    [userId, videoId],
  );
  return result.rows[0]?.exists ?? false;
}

/** 腾讯云自托管版本不使用 SaaS 配额层，登录与匿名用户均可正常解析。 */
export async function checkAnalysisQuota(userId: string | null, _request?: Request) {
  return {
    allowed: true,
    anonymous: !userId,
    limit: Infinity,
    used: 0,
    tier: "free",
    totalLimit: Infinity,
    totalUsed: 0,
  };
}

export async function recordAnalysisUsage(input: { userId: string | null; videoId: string; request?: Request }) {
  if (isLocalMode() || !input.userId) return;
  await queryTencent(
    `INSERT INTO video_analyses (video_id) VALUES ($1) ON CONFLICT (video_id) DO NOTHING`,
    [input.videoId],
  );
  await queryTencent(
    `INSERT INTO user_videos (user_id, video_id) VALUES ($1, $2)
     ON CONFLICT (user_id, video_id) DO UPDATE SET created_at = EXCLUDED.created_at`,
    [input.userId, input.videoId],
  );
}
