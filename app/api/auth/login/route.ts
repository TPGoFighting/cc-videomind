import { z } from "zod";
import { NextResponse } from "next/server";
import { authenticateTencentUser, createTencentSession } from "@/lib/tencent-auth";
import { errorResponse, readJson } from "@/lib/utils/api";
import { withSecurity } from "@/lib/security/middleware";

const CredentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 8 * 1024,
    scope: "auth-login",
    rateLimit: { maxRequests: 10, windowMs: 10 * 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, CredentialsSchema);
    if (!parsed.ok) return parsed.response;
    const user = await authenticateTencentUser(parsed.data.email, parsed.data.password);
    if (!user) return errorResponse("invalid_credentials", "邮箱或密码不正确。", 401);
    const response = NextResponse.json({ ok: true, data: { user: { id: user.id, email: user.email } } });
    const accessToken = await createTencentSession(user.id, response);
    if (request.headers.get("X-Teach-Player-Client") === "android") {
      return NextResponse.json({ ok: true, data: { user: { id: user.id, email: user.email }, accessToken } });
    }
    return response;
  });
}
