import { startOfMonth } from "@/lib/utils/month";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export type SubscriptionTier = "free" | "pro";

export async function getAuthenticatedUserId() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
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
  const limit = tier === "pro" ? 100 : 3;

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
}
