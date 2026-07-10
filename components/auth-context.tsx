"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionTier } from "@/lib/plans";
import { isLocalMode } from "@/lib/local-mode";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  subscriptionTier: SubscriptionTier;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type Profile = {
  role: string;
  email: string | null;
  subscription_tier: string;
};

/** LOCAL_MODE 下的固定本地用户（无远程账号） */
const LOCAL_USER = {
  id: "local",
  email: "local@local",
  app_metadata: {},
  user_metadata: {},
  aud: "local",
  created_at: new Date(0).toISOString(),
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) return;
      const profile = (await res.json()) as Profile & { authenticated: boolean };
      if (profile.authenticated) {
        setIsAdmin(profile.role === "admin");
        setSubscriptionTier((profile.subscription_tier as SubscriptionTier) || "free");
      }
    } catch {
      // /api/me 调用失败时保持默认值
    }
  }, []);

  useEffect(() => {
    // LOCAL_MODE：单机本地工具，无远程登录态，始终视为固定本地用户
    if (isLocalMode()) {
      setUser(LOCAL_USER);
      setSession(null);
      setIsAdmin(false);
      setSubscriptionTier("free");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
      }
      setLoading(false);
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile();
        } else {
          setIsAdmin(false);
          setSubscriptionTier("free");
        }
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    // LOCAL_MODE：无远程会话，仅重置本地态
    if (isLocalMode()) {
      setUser(LOCAL_USER);
      setIsAdmin(false);
      setSubscriptionTier("free");
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAdmin(false);
    setSubscriptionTier("free");
  };

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, isAdmin, subscriptionTier, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth 必须在 AuthProvider 内部使用");
  }
  return context;
}
