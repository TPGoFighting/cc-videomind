import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { withSecurity } from "@/lib/security/middleware";

const SubmitSchema = z.object({
  tier: z.enum(["pro", "max"]),
  transactionId: z.string().min(1).max(100),
});

/** GET — 查询当前用户是否有待审核的提交 */
export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ pending: null });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ pending: null });
  }

  const { data } = await supabase
    .from("payment_submissions")
    .select("tier, status, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ pending: null });
  }

  return NextResponse.json({
    pending: {
      tier: data.tier,
      status: data.status,
      createdAt: data.created_at,
    },
  });
}

/** POST — 提交付款凭证 */
export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 16 * 1024,
    scope: "payment-submit",
    rateLimit: { maxRequests: 20, windowMs: 60_000 },
  }).wrap(request, async () => {
    const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return errorResponse("unauthorized", "请先登录", 401);
  }

  const parsed = await readJson(request, SubmitSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { tier, transactionId } = parsed.data;

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorResponse("db_error", "数据库连接失败", 500);
  }

  // 检查是否已有相同方案的待审核提交
  const { data: existing } = await supabase
    .from("payment_submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("tier", tier)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return errorResponse("duplicate", "你已有一个待审核的相同方案申请，请等待管理员审核。", 409);
  }

  const { error, data: inserted } = await supabase.from("payment_submissions").insert({
    user_id: userId,
    tier,
    transaction_id: transactionId,
  }).select("id").single();

  if (error) {
    console.error("[Payment:Submit] 插入失败:", JSON.stringify(error));
    return errorResponse("submit_failed", `提交失败：${error.message ?? "未知错误"}`, 500);
  }

  console.log("[Payment:Submit] 插入成功:", { id: inserted?.id, userId, tier });
  return successResponse({ ok: true });
});
}
