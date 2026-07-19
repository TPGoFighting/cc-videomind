import { z } from "zod";
import { NextResponse } from "next/server";
import { createTencentSession, registerTencentUser } from "@/lib/tencent-auth";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

const CredentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "注册失败，请稍后重试。";
    return errorResponse("registration_failed", message, 409);
  }
}
