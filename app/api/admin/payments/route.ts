import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/admin";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { clearAiProviderCache } from "@/lib/ai/provider";

const UpdateSchema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

/** GET — 管理员查看所有付款提交 */
export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId || !(await isAdmin(userId))) {
    return errorResponse("forbidden", "仅管理员可访问", 403);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("db_error", "数据库连接失败", 500);
  }

  const query = supabase
    .from("payment_submissions")
    .select("*, profiles:user_id (email)")
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[Admin:Payments] 查询失败:", error);
    return errorResponse("db_error", "查询失败", 500);
  }

  // 展平 profiles.email
  const submissions = (data ?? []).map((s) => ({
    ...s,
    userEmail: (s.profiles as { email?: string } | null)?.email ?? null,
    profiles: undefined,
  }));

  return NextResponse.json({ submissions });
}

/** PUT — 管理员审批/拒绝付款 */
export async function PUT(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId || !(await isAdmin(userId))) {
    return errorResponse("forbidden", "仅管理员可访问", 403);
  }

  const parsed = await readJson(request, UpdateSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { submissionId, action, notes } = parsed.data;

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("db_error", "数据库连接失败", 500);
  }

  // 获取提交记录
  const { data: submission } = await supabase
    .from("payment_submissions")
    .select("id, user_id, tier, status")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    return errorResponse("not_found", "提交记录不存在", 404);
  }

  if (submission.status !== "pending") {
    return errorResponse("already_reviewed", "该提交已被审核过", 400);
  }

  // 更新提交状态
  const { error: updateError } = await supabase
    .from("payment_submissions")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: userId,
      admin_notes: notes ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateError) {
    console.error("[Admin:Payments] 更新失败:", updateError);
    return errorResponse("update_failed", "审核失败", 500);
  }

  // 审批通过：升级用户 tier
  if (action === "approve") {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: submission.tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission.user_id);

    if (profileError) {
      console.error("[Admin:Payments] 升级 tier 失败:", profileError);
      return errorResponse("upgrade_failed", "审核成功但升级失败，请手动处理。", 500);
    }

    clearAiProviderCache();
  }

  return NextResponse.json({ ok: true, status: action === "approve" ? "approved" : "rejected" });
}
