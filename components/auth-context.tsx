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

async function loadProfile(): Promise<Profile> {
  const response = await fetch("/api/me", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load account profile.");
  return response.json() as Promise<Profile>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const localMode = isLocalMode();
  const [user, setUser] = useState<AppUser | null>(() => localMode ? LOCAL_USER : null);
  const [loading, setLoading] = useState(() => !localMode);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");

  const applyProfile = useCallback((profile: Profile) => {
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

  const fetchProfile = useCallback(async () => {
    applyProfile(await loadProfile());
  }, [applyProfile]);

  const refreshProfile = useCallback(async () => {
    // Local mode has no remote session to refresh. Reading /api/me here used
    // to replace the deliberate local user with an unauthenticated response,
    // which made settings (including review cadence) disappear after mount.
    if (localMode) {
      setUser(LOCAL_USER);
      setIsAdmin(false);
      setSubscriptionTier("free");
      return;
    }
    await fetchProfile();
  }, [fetchProfile, localMode]);

  useEffect(() => {
    if (localMode) return;
    void loadProfile().then(applyProfile).catch(() => {
      setUser(null);
    }).finally(() => setLoading(false));
  }, [applyProfile, localMode]);

  const signOut = useCallback(async () => {
    if (!localMode) await fetch("/api/auth/logout", { method: "POST" });
    setUser(localMode ? LOCAL_USER : null);
    setIsAdmin(false);
    setSubscriptionTier("free");
  }, [localMode]);

  return (
    <AuthContext.Provider value={{ user, session: null, loading, isAdmin, subscriptionTier, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必须在 AuthProvider 内部使用");
  return context;
}
