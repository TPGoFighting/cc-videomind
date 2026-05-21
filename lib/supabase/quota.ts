import { startOfMonth } from "@/lib/utils/month";
import { createSupabaseAuthClient, createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
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

export async function checkAnalysisQuota(userId: string | null) {
  if (!userId) {
    return { allowed: true, anonymous: true, limit: 1, used: 0 };
  }

  const supabase = createSupabaseServiceClient();
  const tier = await getProfileTier(userId);
  const limit = tier === "pro" ? 100 : 10;

  if (!supabase) {
    return { allowed: true, anonymous: false, limit, used: 0 };
  }

  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "video_analysis")
    .gte("created_at", startOfMonth().toISOString());

  const used = count ?? 0;
  return { allowed: used < limit, anonymous: false, limit, used };
}

export async function recordAnalysisUsage(input: { userId: string | null; videoId: string }) {
  if (!input.userId) {
    return;
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return;
  }

  await supabase.from("usage_events").insert({
    user_id: input.userId,
    video_id: input.videoId,
    event_type: "video_analysis"
  });

  // 同时记录到 user_videos 用于历史记录
  await supabase.from("user_videos").upsert({
    user_id: input.userId,
    video_id: input.videoId,
  }, { onConflict: "user_id,video_id" });
}
