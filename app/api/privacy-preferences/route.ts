import { isLocalMode } from "@/lib/local-mode";
import { AnalyticsPreferenceSchema } from "@/lib/product/analytics-event";
import { getAnalyticsPreference, setAnalyticsPreference } from "@/lib/product/analytics-store";
import { withSecurity } from "@/lib/security/middleware";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

export async function GET(request: Request) {
  if (isLocalMode()) return successResponse({ analyticsEnabled: false, available: false });
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return errorResponse("unauthorized", "登录后可管理分析偏好。", 401);
  return successResponse({ analyticsEnabled: await getAnalyticsPreference(userId), available: true });
}

export async function PUT(request: Request) {
  return withSecurity({
    allowedMethods: ["PUT"],
    maxBodySize: 4 * 1024,
    scope: "privacy-preferences",
    rateLimit: { maxRequests: 20, windowMs: 60_000 },
  }).wrap(request, async () => {
    if (isLocalMode()) return errorResponse("not_available", "本地模式不记录产品分析事件。", 409);
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "登录后可管理分析偏好。", 401);
    const parsed = await readJson(request, AnalyticsPreferenceSchema);
    if (!parsed.ok) return parsed.response;
    await setAnalyticsPreference(userId, parsed.data.analyticsEnabled);
    return successResponse({ analyticsEnabled: parsed.data.analyticsEnabled });
  });
}
