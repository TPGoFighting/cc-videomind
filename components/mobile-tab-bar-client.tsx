"use client";

import { useAuth } from "@/components/auth-context";
import { usePathname } from "next/navigation";
import { MobileTabBar } from "./mobile-tab-bar";

export function MobileTabBarClient() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  if (["/login", "/register", "/terms", "/privacy", "/support", "/dev/privacy-fixture"].includes(pathname)) return null;
  return <MobileTabBar isAuthenticated={!loading && user !== null} />;
}
