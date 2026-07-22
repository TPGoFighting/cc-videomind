import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy Supabase OAuth callback kept for old bookmarks.
 * Tencent self-hosted email/password sessions are the only launch auth path.
 */
export async function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "oauth_not_supported");
  return NextResponse.redirect(loginUrl);
}
