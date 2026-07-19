import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { isAdmin } from "@/lib/supabase/admin";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/utils/api";

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

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("server_error", "数据库不可用", 500);
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .limit(5);

  return NextResponse.json({ users: data ?? [] });
}

