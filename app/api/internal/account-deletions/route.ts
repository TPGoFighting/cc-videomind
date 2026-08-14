import { recordAdminAuditEventSafely } from "@/lib/product/admin-audit";
import { processDueAccountDeletions } from "@/lib/product/account-deletion-store";
import { withSecurity } from "@/lib/security/middleware";
import { hasWorkerAuthorization } from "@/lib/security/worker-authorization";
import { errorResponse, successResponse } from "@/lib/utils/api";

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 1024,
    scope: "account-deletions-worker",
    skipCsrf: true,
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  }).wrap(request, async () => {
    if (!hasWorkerAuthorization(request, process.env.ACCOUNT_DELETION_WORKER_SECRET)) {
      return errorResponse("forbidden", "无权执行账户删除任务。", 403);
    }
    const result = await processDueAccountDeletions();
    await recordAdminAuditEventSafely(null, {
      action: "account_deletion_worker_run",
      targetType: "account_deletion_batch",
      targetId: `completed-${result.completed}-failed-${result.failed}`,
    });
    return successResponse(result);
  });
}
