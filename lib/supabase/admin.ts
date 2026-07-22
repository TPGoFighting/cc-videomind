import { queryTencent } from "@/lib/tencent-db";

// Legacy import path retained while callers migrate. All production reads and
// writes in this module use the authoritative Tencent PostgreSQL database.

/**
 * 检查用户是否为管理员（基于 app_users.role 字段）。
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const result = await queryTencent<{ role: string }>(
    `SELECT role FROM app_users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  return result.rows[0]?.role === "admin";
}

/**
 * 读取所有全局应用配置（key-value 对）。
 * RLS 策略允许所有认证用户读取，但 API key 等敏感字段仅在前端脱敏。
 */
export async function getAppSettings(): Promise<Record<string, string>> {
  const result = await queryTencent<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings`,
  );

  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

/**
 * 更新单条全局配置（仅 admin 可调用，写入受 RLS 保护）。
 */
export async function updateAppSetting(key: string, value: string, userId: string) {
  await queryTencent(
    `INSERT INTO app_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [key, value, userId],
  );
}

/**
 * 读取用户个人 AI 配置覆盖。
 * 返回 Record<key, value>，空字符串视为未设置。
 */
export async function getUserAiSettings(userId: string): Promise<Record<string, string>> {
  const result = await queryTencent<{ key: string; value: string }>(
    `SELECT key, value FROM user_ai_settings WHERE user_id = $1`,
    [userId],
  );

  const settings: Record<string, string> = {};
  for (const row of result.rows) {
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
  await queryTencent(
    `INSERT INTO user_ai_settings (user_id, key, value, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [userId, key, value],
  );
}

/**
 * 删除用户个人 AI 配置单条。
 */
export async function deleteUserAiSetting(userId: string, key: string) {
  await queryTencent(
    `DELETE FROM user_ai_settings WHERE user_id = $1 AND key = $2`,
    [userId, key],
  );
}

/**
 * 检查用户邮箱是否匹配 ADMIN_EMAIL 环境变量，匹配则自动提升为 admin。
 * 更新腾讯 PostgreSQL 中的 app_users 角色。
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

  const result = await queryTencent(
    `UPDATE app_users SET role = 'admin' WHERE id = $1`,
    [userId],
  );
  return (result.rowCount ?? 0) > 0;
}
