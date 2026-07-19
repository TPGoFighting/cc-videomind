"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SubscriptionTier } from "@/lib/plans";
import { isLocalMode } from "@/lib/local-mode";

type AppUser = { id: string; email?: string | null };

type AuthContextType = {
  user: AppUser | null;
  session: null;
  loading: boolean;
  isAdmin: boolean;
  subscriptionTier: SubscriptionTier;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

type Profile = {
  id?: string;
  role: string | null;
  email: string | null;
  subscription_tier: string | null;
  authenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOCAL_USER: AppUser = { id: "local", email: "local@local" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");

  const fetchProfile = useCallback(async () => {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load account profile.");
    const profile = await response.json() as Profile;
    if (profile.authenticated && profile.id) {
      setUser({ id: profile.id, email: profile.email });
      setIsAdmin(profile.role === "admin");
      setSubscriptionTier((profile.subscription_tier as SubscriptionTier) || "free");
    } else {
      setUser(null);
      setIsAdmin(false);
      setSubscriptionTier("free");
    }
  }, []);

  useEffect(() => {
    if (isLocalMode()) {
      setUser(LOCAL_USER);
      setLoading(false);
      return;
    }
    void fetchProfile().catch(() => {
      setUser(null);
    }).finally(() => setLoading(false));
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    if (!isLocalMode()) await fetch("/api/auth/logout", { method: "POST" });
    setUser(isLocalMode() ? LOCAL_USER : null);
    setIsAdmin(false);
    setSubscriptionTier("free");
  }, []);

  return (
    <AuthContext.Provider value={{ user, session: null, loading, isAdmin, subscriptionTier, signOut, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必须在 AuthProvider 内部使用");
  return context;
}
