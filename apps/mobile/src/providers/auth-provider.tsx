import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, getMe, type SubscriptionTier } from "@/lib/api";
import {
  restoreTencentSession,
  saveTencentSession,
  signInTencent,
  signOutTencent,
  signUpTencent,
  type TencentAuthUser,
} from "@/lib/tencent-auth-client";

type AuthContextValue = {
  user: TencentAuthUser | null;
  accessToken: string | null;
  loading: boolean;
  configured: boolean;
  isAdmin: boolean;
  subscriptionTier: SubscriptionTier;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TencentAuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const configured = true;

  const refreshProfile = useCallback(async () => {
    if (!accessToken) {
      setIsAdmin(false);
      setSubscriptionTier("free");
      return;
    }

    try {
      const profile = await getMe(accessToken);
      setIsAdmin(profile.role === "admin");
      setSubscriptionTier(profile.subscription_tier ?? "free");
      if (typeof profile.email === "string") {
        const email = profile.email;
        setUser((currentUser) => currentUser && currentUser.email !== email
          ? { ...currentUser, email }
          : currentUser);
      }
    } catch (error) {
      // A revoked/expired token must not keep the user in a stale privileged
      // UI state. Remove only the local session; the next login can recover.
      if (error instanceof ApiError && error.status === 401) {
        await signOutTencent(null);
        setUser(null);
        setAccessToken(null);
        setIsAdmin(false);
        setSubscriptionTier("free");
      }
      throw error;
    }
  }, [accessToken]);

  useEffect(() => {
    restoreTencentSession()
      .then((session) => {
        setUser(session?.user ?? null);
        setAccessToken(session?.accessToken ?? null);
      })
      .catch(() => {
        // A corrupt or expired local session must not leave the provider in an
        // unhandled-rejection state or block the anonymous learning flow.
        setUser(null);
        setAccessToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setIsAdmin(false);
      setSubscriptionTier("free");
      return;
    }

    refreshProfile().catch(() => {
      setIsAdmin(false);
      setSubscriptionTier("free");
    });
  }, [accessToken, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await signInTencent(email, password);
    await saveTencentSession(session);
    setUser(session.user);
    setAccessToken(session.accessToken);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const session = await signUpTencent(email, password);
    await saveTencentSession(session);
    setUser(session.user);
    setAccessToken(session.accessToken);
  }, []);

  const signOut = useCallback(async () => {
    await signOutTencent(accessToken);
    setUser(null);
    setAccessToken(null);
    setIsAdmin(false);
    setSubscriptionTier("free");
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      loading,
      configured,
      isAdmin,
      subscriptionTier,
      refreshProfile,
      signIn,
      signUp,
      signOut,
    }),
    [accessToken, configured, isAdmin, loading, refreshProfile, signIn, signOut, signUp, subscriptionTier, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
