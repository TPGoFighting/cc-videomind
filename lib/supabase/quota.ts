import { createSupabaseAuthClient, createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

export type SubscriptionTier = "free" | "pro";

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

  return data?.subscription_tier === "pro" ? "pro" : "free";
}

export async function checkAnalysisQuota(userId: string | null, request?: Request) {
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
  if (!supabase) return { allowed: true, anonymous: false, limit: tier === "pro" ? 100 : 3, used: 0 };

  // 每日配额（UTC+8 北京时间）
  const todayStart = new Date();
  todayStart.setHours(todayStart.getHours() + 8, 0, 0, 0);

  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "video_analysis")
    .gte("created_at", todayStart.toISOString());

  const limit = tier === "pro" ? 100 : 3;
  const used = count ?? 0;
  return { allowed: used < limit, anonymous: false, limit, used };
}

function getClientIp(request?: Request): string {
  if (!request) return "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  return realIp ?? "unknown";
}

export async function recordAnalysisUsage(input: { userId: string | null; videoId: string; request?: Request }) {
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
