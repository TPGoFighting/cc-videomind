import { NextResponse } from "next/server";
import { clearTencentSession } from "@/lib/tencent-auth";
import { withSecurity } from "@/lib/security/middleware";

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 1024,
    scope: "auth-logout",
    rateLimit: { maxRequests: 20, windowMs: 60_000 },
  }).wrap(request, async () => {
    const response = NextResponse.json({ ok: true, data: { signedOut: true } });
    await clearTencentSession(response, request);
    return response;
  });
}
