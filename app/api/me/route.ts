import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { promoteToAdminIfEligible } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({
      role: null,
      email: null,
      subscription_tier: null,
      authenticated: false
    });
  }

  const supabase = createSupabaseServiceClient() ?? (await createSupabaseServerClient());
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, subscription_tier")
    .eq("id", userId)
    .single();

  if (profile?.email && profile.role !== "admin") {
    const promoted = await promoteToAdminIfEligible(userId, profile.email);
    if (promoted) {
      profile.role = "admin";
    }
  }

  return NextResponse.json({
    role: profile?.role ?? "user",
    email: profile?.email ?? null,
    subscription_tier: profile?.subscription_tier ?? "free",
    authenticated: true
  });
}
