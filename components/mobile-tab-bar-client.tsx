"use client";

import { useAuth } from "@/components/auth-context";
import { MobileTabBar } from "./mobile-tab-bar";

export function MobileTabBarClient() {
  const { user, loading } = useAuth();
  return <MobileTabBar isAuthenticated={!loading && user !== null} />;
}
