import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/quota";
import {
  getAppSettings,
  isAdmin,
  updateAppSetting,
} from "@/lib/supabase/admin";
import { clearAiProviderCache } from "@/lib/ai/provider";
import { errorResponse, readJson } from "@/lib/utils/api";

const AI_SETTING_KEYS = [
  "ai_provider",
  "ai_api_key",
  "ai_api_base_url",
  "ai_model",
] as const;

const UpdateSchema = z.object({
  key: z.enum(AI_SETTING_KEYS),
  value: z.string(),
});

/**
 * GET  — 返回当前 AI 配置。
 *         admin 看到完整值，非 admin 看到脱敏版本（仅展示首尾几位）。
 */
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const admin = await isAdmin(userId);
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

  return NextResponse.json({ admin, config });
}

/**
 * PUT — 更新单条 AI 配置（仅 admin）。
 */
export async function PUT(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const admin = await isAdmin(userId);
  if (!admin) {
    return errorResponse("forbidden", "仅管理员可修改配置", 403);
  }

  const parsed = await readJson(request, UpdateSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { key, value } = parsed.data;

  try {
    await updateAppSetting(key, value, userId);
    // 写入后清除 provider 缓存（下次 AI 调用即生效）
    clearAiProviderCache();
    return NextResponse.json({ ok: true, key });
  } catch (err) {
    console.error("[Admin:Settings] 更新失败:", err);
    return errorResponse(
      "update_failed",
      "配置保存失败，请稍后重试。",
      500,
    );
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}
