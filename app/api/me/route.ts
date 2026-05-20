import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { promoteToAdminIfEligible } from "@/lib/supabase/admin";

export async function GET() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({
      role: null,
      email: null,
      subscription_tier: null,
      authenticated: false,
    });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 未配置" },
      { status: 500 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, subscription_tier")
    .eq("id", userId)
    .single();

  // 检查并自动提升为管理员
  if (profile && profile.email && profile.role !== "admin") {
    const promoted = await promoteToAdminIfEligible(userId, profile.email);
    if (promoted) {
      profile.role = "admin";
    }
  }

  return NextResponse.json({
    role: profile?.role ?? "user",
    email: profile?.email ?? null,
    subscription_tier: profile?.subscription_tier ?? "free",
    authenticated: true,
  });
}
