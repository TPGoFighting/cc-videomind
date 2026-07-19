import { NextResponse } from "next/server";
import { getTencentUser } from "@/lib/tencent-auth";

export async function GET(request: Request) {
  const user = await getTencentUser(request);
  if (!user) {
    return NextResponse.json({
      role: null,
      email: null,
      subscription_tier: null,
      authenticated: false
    });
  }

  return NextResponse.json({
    id: user.id,
    role: user.role,
    email: user.email,
    subscription_tier: user.subscriptionTier,
    authenticated: true,
  });
}
