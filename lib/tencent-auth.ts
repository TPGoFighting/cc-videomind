import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { hasTencentDatabase, queryTencent } from "@/lib/tencent-db";

const scrypt = promisify(scryptCallback);
export const TENCENT_SESSION_COOKIE = "teachplayer_session";
const SESSION_DAYS = 30;

export type TencentUser = {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
};

export function getTencentSessionCookieOptions(expires: Date, secure = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await scrypt(password, salt, 64) as Buffer;
  return key.toString("hex");
}

export async function registerTencentUser(emailInput: string, password: string): Promise<TencentUser> {
  const email = emailInput.trim().toLowerCase();
  const existing = await queryTencent<{ id: string }>(`SELECT id FROM app_users WHERE email = $1`, [email]);
  if (existing.rowCount) throw new Error("该邮箱已注册，请直接登录。");

  const salt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(password, salt);
  const user: TencentUser = {
    id: randomUUID(),
    email,
    role: process.env.ADMIN_EMAIL?.split(",").map((item) => item.trim().toLowerCase()).includes(email) ? "admin" : "user",
    subscriptionTier: "free",
  };
  await queryTencent(
    `INSERT INTO app_users (id, email, password_hash, password_salt, role, subscription_tier)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, user.email, passwordHash, salt, user.role, user.subscriptionTier],
  );
  return user;
}

export async function authenticateTencentUser(emailInput: string, password: string): Promise<TencentUser | null> {
  const email = emailInput.trim().toLowerCase();
  const result = await queryTencent<{
    id: string; email: string; password_hash: string; password_salt: string; role: string; subscription_tier: string;
  }>(`SELECT id, email, password_hash, password_salt, role, subscription_tier FROM app_users WHERE email = $1`, [email]);
  const row = result.rows[0];
  if (!row) return null;
  const actual = Buffer.from(await hashPassword(password, row.password_salt), "hex");
  const expected = Buffer.from(row.password_hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { id: row.id, email: row.email, role: row.role, subscriptionTier: row.subscription_tier };
}

export async function changeTencentPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const result = await queryTencent<{ password_hash: string; password_salt: string }>(
    `SELECT password_hash, password_salt FROM app_users WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return false;

  const actual = Buffer.from(await hashPassword(currentPassword, row.password_salt), "hex");
  const expected = Buffer.from(row.password_hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

  const salt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(newPassword, salt);
  await queryTencent(
    `UPDATE app_users SET password_hash = $1, password_salt = $2 WHERE id = $3`,
    [passwordHash, salt, userId],
  );
  return true;
}

export async function createTencentSession(userId: string, response: NextResponse): Promise<string> {
  const token = randomBytes(48).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await queryTencent(
    `INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`,
    [hashToken(token), userId, expires],
  );
  response.cookies.set(TENCENT_SESSION_COOKIE, token, getTencentSessionCookieOptions(expires));
  return token;
}

export function getTencentBearerToken(request?: Request): string | null {
  const authorization = request?.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function getSessionToken(request?: Request): Promise<string | null> {
  return getTencentBearerToken(request) ?? (await cookies()).get(TENCENT_SESSION_COOKIE)?.value ?? null;
}

export async function getTencentUser(request?: Request): Promise<TencentUser | null> {
  if (!hasTencentDatabase()) {
    return null;
  }

  const token = await getSessionToken(request);
  if (!token) return null;
  const result = await queryTencent<{
    id: string; email: string; role: string; subscription_tier: string;
  }>(
    `SELECT u.id, u.email, u.role, u.subscription_tier
     FROM app_sessions s JOIN app_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  return row ? { id: row.id, email: row.email, role: row.role, subscriptionTier: row.subscription_tier } : null;
}

export async function clearTencentSession(response: NextResponse, request?: Request): Promise<void> {
  const token = await getSessionToken(request);
  if (token) {
    await queryTencent(`DELETE FROM app_sessions WHERE token_hash = $1`, [hashToken(token)]);
  }
  response.cookies.set(TENCENT_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
