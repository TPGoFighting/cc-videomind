import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getMe, type SubscriptionTier } from "@/lib/api";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const configured = isSupabaseConfigured();

  const refreshProfile = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setIsAdmin(false);
      setSubscriptionTier("free");
      return;
    }

    const me = await getMe(token);
    setIsAdmin(me.role === "admin");
    setSubscriptionTier(me.subscription_tier ?? "free");
  }, [session?.access_token]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  useEffect(() => {
    if (!session?.access_token) {
      setIsAdmin(false);
      setSubscriptionTier("free");
      return;
    }

    refreshProfile().catch(() => {
      setIsAdmin(false);
      setSubscriptionTier("free");
    });
  }, [refreshProfile, session?.access_token]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signUp({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!configured) {
      return;
    }
    await getSupabaseClient().auth.signOut();
    setIsAdmin(false);
    setSubscriptionTier("free");
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      accessToken: session?.access_token ?? null,
      loading,
      configured,
      isAdmin,
      subscriptionTier,
      refreshProfile,
      signIn,
      signUp,
      signOut
    }),
    [configured, isAdmin, loading, refreshProfile, session, signIn, signOut, signUp, subscriptionTier]
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
