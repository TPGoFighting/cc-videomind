import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "./runtime-config";

const SESSION_KEY = "teach-player_tencent-session";
const NATIVE_CLIENT_HEADER = { "X-Teach-Player-Client": "android" };

export type TencentAuthUser = {
  id: string;
  email: string;
};

export type TencentSession = {
  accessToken: string;
  user: TencentAuthUser;
};

type AuthResponse = {
  user: TencentAuthUser;
  accessToken: string;
};

async function requestAuth(path: string, body: Record<string, string>, accessToken?: string | null): Promise<AuthResponse> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...NATIVE_CLIENT_HEADER,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as {
    ok?: boolean;
    data?: Partial<AuthResponse>;
    error?: { message?: string };
  } | null;

  if (!response.ok || !payload?.ok || !payload.data?.user || !payload.data.accessToken) {
    throw new Error(payload?.error?.message || "账户服务暂时不可用，请稍后重试。");
  }

  return { user: payload.data.user, accessToken: payload.data.accessToken };
}

export async function signInTencent(email: string, password: string): Promise<TencentSession> {
  return requestAuth("/api/auth/login", { email, password });
}

export async function signUpTencent(email: string, password: string): Promise<TencentSession> {
  return requestAuth("/api/auth/register", { email, password });
}

export async function changeTencentPassword(currentPassword: string, newPassword: string, accessToken: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/change-password`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...NATIVE_CLIENT_HEADER,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const payload = await response.json().catch(() => null) as { ok?: boolean; error?: { message?: string } } | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message || "密码修改失败，请稍后重试。");
  }
}

export async function saveTencentSession(session: TencentSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function restoreTencentSession(): Promise<TencentSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<TencentSession>;
    if (typeof parsed.accessToken === "string" && parsed.accessToken && parsed.user?.id && parsed.user.email) {
      return { accessToken: parsed.accessToken, user: parsed.user as TencentAuthUser };
    }
  } catch {
    // A corrupted native session is safely discarded below.
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
  return null;
}

export async function signOutTencent(accessToken: string | null): Promise<void> {
  if (accessToken) {
    await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
      method: "POST",
      headers: { Accept: "application/json", ...NATIVE_CLIENT_HEADER, Authorization: `Bearer ${accessToken}` },
    }).catch(() => undefined);
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
