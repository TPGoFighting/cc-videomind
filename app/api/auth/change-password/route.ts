import { z } from "zod";
import { changeTencentPassword, getTencentUser } from "@/lib/tencent-auth";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 16 * 1024,
    scope: "change-password",
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  }).wrap(request, async () => {
    const user = await getTencentUser(request);
    if (!user) {
      return errorResponse("unauthorized", "请先登录后再修改密码。", 401);
    }

    const parsed = await readJson(request, ChangePasswordSchema);
    if (!parsed.ok) return parsed.response;

    const changed = await changeTencentPassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
    if (!changed) {
      return errorResponse("invalid_credentials", "当前密码不正确。", 400);
    }

    return successResponse({ changed: true });
  });
}
