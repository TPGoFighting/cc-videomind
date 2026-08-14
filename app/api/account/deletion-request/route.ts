import { getTencentUser, authenticateTencentUser } from "@/lib/tencent-auth";
import { isLocalMode } from "@/lib/local-mode";
import {
  ACCOUNT_DELETION_SCOPE,
  AccountDeletionRequestSchema,
} from "@/lib/product/account-deletion";
import {
  cancelAccountDeletionRequest,
  createAccountDeletionRequest,
  getLatestAccountDeletionRequest,
} from "@/lib/product/account-deletion-store";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

export async function GET(request: Request) {
  if (isLocalMode()) return successResponse({ request: null, available: false, scope: ACCOUNT_DELETION_SCOPE });
  const user = await getTencentUser(request);
  if (!user) return errorResponse("unauthorized", "请先登录。", 401);
  return successResponse({
    request: await getLatestAccountDeletionRequest(user.id),
    available: user.role !== "admin",
    scope: ACCOUNT_DELETION_SCOPE,
  });
}

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 8 * 1024,
    scope: "account-deletion-request",
    rateLimit: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  }).wrap(request, async () => {
    if (isLocalMode()) return errorResponse("not_available", "本地模式没有可删除的云端账户。", 409);
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);
    if (user.role === "admin") return errorResponse("admin_manual_review", "管理员账户需要先移交权限，再联系支持处理。", 409);

    const parsed = await readJson(request, AccountDeletionRequestSchema);
    if (!parsed.ok) return parsed.response;
    const verified = await authenticateTencentUser(user.email, parsed.data.password);
    if (!verified || verified.id !== user.id) return errorResponse("invalid_credentials", "密码不正确。", 401);

    const deletionRequest = await createAccountDeletionRequest(user.id, user.email);
    return successResponse({ request: deletionRequest, scope: ACCOUNT_DELETION_SCOPE });
  });
}

export async function DELETE(request: Request) {
  return withSecurity({
    allowedMethods: ["DELETE"],
    maxBodySize: 4 * 1024,
    scope: "account-deletion-request",
    rateLimit: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  }).wrap(request, async () => {
    if (isLocalMode()) return errorResponse("not_available", "本地模式没有可删除的云端账户。", 409);
    const user = await getTencentUser(request);
    if (!user) return errorResponse("unauthorized", "请先登录。", 401);
    const deletionRequest = await cancelAccountDeletionRequest(user.id);
    if (!deletionRequest) return errorResponse("not_cancellable", "当前没有可撤销的删除请求。", 409);
    return successResponse({ request: deletionRequest });
  });
}
