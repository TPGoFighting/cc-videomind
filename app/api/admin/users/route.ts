import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { isAdmin } from "@/lib/supabase/admin";
import { queryTencent } from "@/lib/tencent-db";
import { errorResponse } from "@/lib/utils/api";
import { recordAdminAuditEventSafely } from "@/lib/product/admin-audit";

/**
 * GET — 管理员通过邮箱查找用户（返回 userId + email）。
 *       ?email=xxx@example.com
 */
export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!(await isAdmin(userId))) {
    return errorResponse("forbidden", "仅管理员可查询用户", 403);
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return errorResponse("invalid_request", "缺少 email 参数", 400);
  }

  const result = await queryTencent<{ id: string; email: string }>(
    `SELECT id, email FROM app_users WHERE LOWER(email) = $1 LIMIT 5`,
    [email],
  );

  await recordAdminAuditEventSafely(userId, {
    action: "user_lookup",
    targetType: "user",
    targetId: "email-exact-match",
  });

  return NextResponse.json({ users: result.rows });
}
