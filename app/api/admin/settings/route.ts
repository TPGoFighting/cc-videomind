import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import {
  deleteUserAiSetting,
  getAppSettings,
  getUserAiSettings,
  isAdmin,
  updateAppSetting,
  updateUserAiSetting,
} from "@/lib/supabase/admin";
import { clearAiProviderCache } from "@/lib/ai/provider";
import { errorResponse, readJson } from "@/lib/utils/api";
import { withSecurity } from "@/lib/security/middleware";
import { recordAdminAuditEventSafely } from "@/lib/product/admin-audit";

const AI_SETTING_KEYS = [
  "ai_provider",
  "ai_api_key",
  "ai_api_base_url",
  "ai_model",
] as const;

const UpdateSchema = z.object({
  scope: z.enum(["global", "personal"]).optional(),
  key: z.enum(AI_SETTING_KEYS),
  value: z.string(),
  targetUserId: z.string().uuid().optional(),
});

interface ProviderInfo {
  id: string;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: "deepseek",
    displayName: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-flash",
  },
  {
    id: "openai-compatible",
    displayName: "OpenAI 兼容",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
  {
    id: "gemini",
    displayName: "Google Gemini",
    defaultBaseUrl: "",
    defaultModel: "gemini-2.5-flash",
  },
];

/**
 * GET  — 返回当前 AI 配置。
 *         admin 可通过 ?targetUserId=xxx 查看指定用户的个人配置。
 *         非 admin 对 api_key 脱敏，且只能看自己的配置。
 */
export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const admin = await isAdmin(userId);

  // admin 可通过 query param 指定目标用户
  const { searchParams } = new URL(request.url);
  const targetUserId = admin ? searchParams.get("targetUserId") : null;
  const personalUserId = targetUserId ?? userId;

  const settings = await getAppSettings();

  const config: Record<string, string | null> = {};
  for (const key of AI_SETTING_KEYS) {
    const value = settings[key] ?? null;
    // 非管理员对 api_key 脱敏
    if (!admin && key === "ai_api_key" && value) {
      config[key] = maskApiKey(value);
    } else {
      config[key] = value;
    }
  }

  // 读取目标用户个人 AI 配置覆盖
  const userSettings = await getUserAiSettings(personalUserId);
  const personal: Record<string, string | null> = {};
  for (const key of AI_SETTING_KEYS) {
    personal[key] = userSettings[key] ?? null;
  }

  return NextResponse.json({
    admin,
    global: config,
    personal,
    providers: PROVIDERS,
  });
}

/**
 * PUT — 更新单条 AI 配置（仅 admin）。
 *        scope="global" → 写入 app_settings；
 *        scope="personal" → 写入 user_ai_settings（targetUserId 指定目标用户，默认当前用户）。
 */
export async function PUT(request: Request) {
  return withSecurity({
    allowedMethods: ["PUT"],
    maxBodySize: 16 * 1024,
    scope: "admin-settings",
    rateLimit: { maxRequests: 60, windowMs: 60_000 },
  }).wrap(request, async () => {
      const userId = await getAuthenticatedUserId(request);
      if (!userId) {
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
      }

      // 所有写入操作均需要管理员权限
      const admin = await isAdmin(userId);
      if (!admin) {
        return errorResponse("forbidden", "仅管理员可修改配置", 403);
      }

      const parsed = await readJson(request, UpdateSchema);
      if (!parsed.ok) {
        return parsed.response;
      }

      const { scope, key, value, targetUserId } = parsed.data;

      try {
        if (scope === "personal") {
          const uid = targetUserId ?? userId;
          if (value === "") {
            await deleteUserAiSetting(uid, key);
          } else {
            await updateUserAiSetting(uid, key, value);
          }
        } else {
          await updateAppSetting(key, value, userId);
        }

        // 写入后清除 provider 缓存（下次 AI 调用即生效）
        clearAiProviderCache();
        await recordAdminAuditEventSafely(userId, {
          action: "settings_updated",
          targetType: "setting",
          targetId: `${scope ?? "global"}/${key}`,
        });
        return NextResponse.json({ ok: true, key, scope: scope ?? "global" });
      } catch (err) {
        console.error("[Admin:Settings] 更新失败:", err);
        return errorResponse(
          "update_failed",
          "配置保存失败，请稍后重试。",
          500,
        );
      }
  });
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}
