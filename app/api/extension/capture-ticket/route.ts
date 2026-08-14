import { getAsrConfiguration, AsrConfigurationError } from "@/lib/asr/client";
import { isBilibiliVideoId } from "@/lib/bilibili/id";
import { issueCaptureTicket } from "@/lib/extension/capture-ticket";
import { checkAnalysisQuota, getAuthenticatedUserId } from "@/lib/supabase/quota";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, successResponse } from "@/lib/utils/api";

const TICKET_TTL_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    scope: "extension-capture-ticket",
    rateLimit: { maxRequests: 6, windowMs: 60_000 },
  }).wrap(request, async () => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "登录后才能使用浏览器转写。", 401);

    const body = await request.json().catch(() => null) as { sourceVideoId?: unknown; consent?: unknown } | null;
    const sourceVideoId = typeof body?.sourceVideoId === "string" ? body.sourceVideoId.trim() : "";
    if (!isBilibiliVideoId(sourceVideoId)) return errorResponse("invalid_bilibili_video", "请提供有效的 B 站 BV/av 号。", 400);
    if (body?.consent !== true) return errorResponse("consent_required", "请确认你拥有或已获授权转写该媒体。", 400);

    try {
      getAsrConfiguration();
    } catch (error) {
      if (error instanceof AsrConfigurationError) {
        return errorResponse("asr_not_configured", "媒体转写服务暂不可用，请稍后再试。", 503);
      }
      throw error;
    }

    const quota = await checkAnalysisQuota(userId, request);
    if (!quota.allowed) return errorResponse("quota_exceeded", "已达到当前套餐的学习材料导入额度。", 402);

    const expiresAt = new Date(Date.now() + TICKET_TTL_MS);
    const ticket = await issueCaptureTicket({ userId, sourceVideoId, expiresAt });
    return successResponse({ ticket, expiresAt: expiresAt.toISOString() });
  });
}
