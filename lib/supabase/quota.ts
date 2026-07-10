import { createSupabaseAuthClient, createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";
import { type SubscriptionTier, getPlanConfig } from "@/lib/plans";
import { isLocalMode } from "@/lib/local-mode";

/** LOCAL_MODE 下的固定本地用户 id */
export const LOCAL_USER_ID = "local";

export type { SubscriptionTier };

export function getBearerToken(request?: Request) {
  const authorization = request?.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function getAuthenticatedUser(request?: Request): Promise<User | null> {
  const bearerToken = getBearerToken(request);
  if (bearerToken) {
    const supabase = createSupabaseAuthClient();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase.auth.getUser(bearerToken);
    if (error) {
      return null;
    }

    return data.user;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getAuthenticatedUserId(request?: Request) {
  // LOCAL_MODE：单机本地工具无远程账号，始终视为同一个本地用户
  if (isLocalMode()) {
    return LOCAL_USER_ID;
  }

  const user = await getAuthenticatedUser(request);
  return user?.id ?? null;
}

export async function getProfileTier(userId: string): Promise<SubscriptionTier> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return "free";
  }

  const { data } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  const tier = data?.subscription_tier;
  if (tier === "pro" || tier === "max") return tier;
  return "free";
}

/** 检查用户（或匿名IP）是否已经解析过某个视频 */
export async function hasUserAnalyzedVideo(userId: string | null, videoId: string, request?: Request): Promise<boolean> {
  // LOCAL_MODE：本地存储由数据层 Agent 通过 lib/db/local-store.ts 实现，此处先返回 false（未分析）
  // TODO(local-store): 改为查询 lib/db/local-store.ts 的本地 usage 记录
  if (isLocalMode()) {
    return false;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return false;

  if (userId) {
    const { count } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "video_analysis")
      .eq("video_id", videoId);
    return (count ?? 0) > 0;
  }

  // 匿名用户：按 IP 查
  const clientIp = getClientIp(request);
  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .is("user_id", null)
    .eq("event_type", "video_analysis")
    .eq("video_id", videoId)
    .eq("ip_address", clientIp);
  return (count ?? 0) > 0;
}

export async function checkAnalysisQuota(userId: string | null, request?: Request) {
  // LOCAL_MODE：本地工具无配额限制，始终放行
  if (isLocalMode()) {
    return { allowed: true, anonymous: false, limit: Infinity, used: 0 };
  }

  const supabase = createSupabaseServiceClient();

  // 匿名用户：最多 1 条
  if (!userId) {
    if (!supabase) return { allowed: true, anonymous: true, limit: 1, used: 0 };

    const clientIp = getClientIp(request);
    const { count } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .is("user_id", null)
      .eq("event_type", "video_analysis")
      .eq("ip_address", clientIp);

    const used = count ?? 0;
    return { allowed: used < 1, anonymous: true, limit: 1, used };
  }

  // 管理员：无上限
  const admin = await isAdmin(userId);
  if (admin) return { allowed: true, anonymous: false, limit: Infinity, used: 0, isAdmin: true };

  const tier = await getProfileTier(userId);
  const plan = getPlanConfig(tier);
  if (!supabase) return { allowed: true, anonymous: false, tier, dailyLimit: plan.dailyLimit, weeklyLimit: plan.weeklyLimit, dailyUsed: 0, weeklyUsed: 0 };

  // 免费版：总计 3 次，不按天/周重置
  if (tier === "free") {
    const { count } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "video_analysis");

    const totalUsed = count ?? 0;
    return { allowed: totalUsed < plan.dailyLimit, anonymous: false, tier: "free" as const, totalLimit: plan.dailyLimit, totalUsed };
  }

  // 付费用户：日+周配额（UTC+8 北京时间）
  const dayStart = new Date();
  dayStart.setHours(dayStart.getHours() + 8, 0, 0, 0);

  const weekStart = getWeekStart();

  const [{ count: dailyCount }, { count: weeklyCount }] = await Promise.all([
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "video_analysis")
      .gte("created_at", dayStart.toISOString()),
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "video_analysis")
      .gte("created_at", weekStart.toISOString()),
  ]);

  const dailyUsed = dailyCount ?? 0;
  const weeklyUsed = weeklyCount ?? 0;
  const allowed = dailyUsed < plan.dailyLimit && weeklyUsed < plan.weeklyLimit;

  return { allowed, anonymous: false, tier, dailyLimit: plan.dailyLimit, weeklyLimit: plan.weeklyLimit, dailyUsed, weeklyUsed };
}

/** UTC+8 本周一 00:00 */
function getWeekStart(): Date {
  const now = new Date();
  // 转到 UTC+8
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const day = utc8.getUTCDay(); // 0=周日, 1=周一...
  const mondayOffset = day === 0 ? -6 : 1 - day;
  utc8.setUTCDate(utc8.getUTCDate() + mondayOffset);
  utc8.setUTCHours(0, 0, 0, 0);
  // 转回 UTC
  return new Date(utc8.getTime() - 8 * 60 * 60 * 1000);
}

function getClientIp(request?: Request): string {
  if (!request) return "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  return realIp ?? "unknown";
}

export async function recordAnalysisUsage(input: { userId: string | null; videoId: string; request?: Request }) {
  // LOCAL_MODE：本地存储由数据层 Agent 通过 lib/db/local-store.ts 实现，此处先 no-op
  // TODO(local-store): 改为写入 lib/db/local-store.ts 的本地 usage 记录
  if (isLocalMode()) {
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const clientIp = input.userId ? null : getClientIp(input.request);

  await supabase.from("usage_events").insert({
    user_id: input.userId ?? null,
    video_id: input.videoId,
    event_type: "video_analysis",
    ip_address: clientIp,
  });

  // 仅登录用户记录到 user_videos（未登录没有 user_id）
  if (input.userId) {
    await supabase.from("user_videos").upsert({
      user_id: input.userId,
      video_id: input.videoId,
    }, { onConflict: "user_id,video_id" });
  }
}
