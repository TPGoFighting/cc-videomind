import { z } from "zod";
import { NextResponse } from "next/server";
import { createTencentSession, registerTencentUser } from "@/lib/tencent-auth";
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
    scope: "auth-register",
    rateLimit: { maxRequests: 5, windowMs: 60 * 60_000 },
  }).wrap(request, async () => {
    const parsed = await readJson(request, CredentialsSchema);
    if (!parsed.ok) return parsed.response;
    try {
      const user = await registerTencentUser(parsed.data.email, parsed.data.password);
      const response = NextResponse.json({ ok: true, data: { user: { id: user.id, email: user.email } } });
      const accessToken = await createTencentSession(user.id, response);
      if (request.headers.get("X-Teach-Player-Client") === "android") {
        return NextResponse.json({ ok: true, data: { user: { id: user.id, email: user.email }, accessToken } });
      }
      return response;
    } catch {
      return errorResponse("registration_failed", "暂时无法创建账户。若已有账户，请直接登录。", 409);
    }
  });
}
