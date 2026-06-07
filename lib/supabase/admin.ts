import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * 检查用户是否为管理员（基于 profiles.role 字段）。
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role === "admin";
}

/**
 * 读取所有全局应用配置（key-value 对）。
 * RLS 策略允许所有认证用户读取，但 API key 等敏感字段仅在前端脱敏。
 */
export async function getAppSettings(): Promise<Record<string, string>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return {};

  const { data } = await supabase.from("app_settings").select("key, value");

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }
  return settings;
}

/**
 * 更新单条全局配置（仅 admin 可调用，写入受 RLS 保护）。
 */
export async function updateAppSetting(key: string, value: string, userId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase 未配置");

  const { error } = await supabase.from("app_settings").upsert({
    key,
    value,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

/**
 * 读取用户个人 AI 配置覆盖。
 * 返回 Record<key, value>，空字符串视为未设置。
 */
export async function getUserAiSettings(userId: string): Promise<Record<string, string>> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return {};

  const { data } = await supabase
    .from("user_ai_settings")
    .select("key, value")
    .eq("user_id", userId);

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.value !== "") {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

/**
 * Upsert 用户个人 AI 配置单条。传 value="" 等效于删除。
 */
export async function updateUserAiSetting(userId: string, key: string, value: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase 未配置");

  const { error } = await supabase.from("user_ai_settings").upsert({
    user_id: userId,
    key,
    value,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

/**
 * 删除用户个人 AI 配置单条。
 */
export async function deleteUserAiSetting(userId: string, key: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) throw new Error("Supabase 未配置");

  const { error } = await supabase
    .from("user_ai_settings")
    .delete()
    .eq("user_id", userId)
    .eq("key", key);

  if (error) throw error;
}

/**
 * 检查用户邮箱是否匹配 ADMIN_EMAIL 环境变量，匹配则自动提升为 admin。
 * 使用 service client 绕过 RLS，因为此时用户的 profile 可能刚创建。
 */
export async function promoteToAdminIfEligible(
  userId: string,
  email: string,
): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0 || !email) return false;
  if (!adminEmails.includes(email.toLowerCase())) return false;

  const supabase = createSupabaseServiceClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);

  if (error) {
    console.error("[Admin] 提升管理员失败:", error.message);
    return false;
  }

  console.log("[Admin] 已自动提升用户为管理员:", email);
  return true;
}
