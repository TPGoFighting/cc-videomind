import { z } from "zod";
import { getTencentUser } from "@/lib/tencent-auth";
import { recordAdminAuditEventSafely } from "@/lib/product/admin-audit";
import { getProductMetrics } from "@/lib/product/analytics-store";
import { errorResponse, successResponse } from "@/lib/utils/api";

const WindowSchema = z.coerce.number().int().min(7).max(180).default(30);

export async function GET(request: Request) {
  const admin = await getTencentUser(request);
  if (!admin) return errorResponse("unauthorized", "请先登录。", 401);
  if (admin.role !== "admin") return errorResponse("forbidden", "仅管理员可访问。", 403);

  const parsed = WindowSchema.safeParse(new URL(request.url).searchParams.get("days") ?? undefined);
  if (!parsed.success) return errorResponse("invalid_window", "统计窗口必须在 7 到 180 天之间。", 400);
  const metrics = await getProductMetrics(parsed.data);
  await recordAdminAuditEventSafely(admin.id, {
    action: "metrics_viewed",
    targetType: "metrics",
    targetId: `${parsed.data}d`,
  });
  return successResponse({ metrics });
}
