/** 底部标签栏导航项 —— 供 web MobileTabBar 和未来 React Native 共用 */

export interface NavItem {
  id: string;
  label: string;
  labelEn: string;
  href: string;
  iconName: "Play" | "Clock" | "RefreshCw" | "BookOpen" | "User";
  authRequired: boolean;
  matchPattern: (pathname: string) => boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    label: "首页",
    labelEn: "Home",
    href: "/",
    iconName: "Play",
    authRequired: false,
    matchPattern: (p) => p === "/" || p.startsWith("/video"),
  },
  {
    id: "history",
    label: "历史",
    labelEn: "History",
    href: "/history",
    iconName: "Clock",
    authRequired: true,
    matchPattern: (p) => p === "/history",
  },
  {
    id: "review",
    label: "复习",
    labelEn: "Review",
    href: "/review",
    iconName: "RefreshCw",
    authRequired: true,
    matchPattern: (p) => p === "/review",
  },
  {
    id: "vocabulary",
    label: "单词",
    labelEn: "Vocab",
    href: "/vocabulary",
    iconName: "BookOpen",
    authRequired: true,
    matchPattern: (p) => p === "/vocabulary",
  },
  {
    id: "profile",
    label: "我的",
    labelEn: "Profile",
    href: "/settings",
    iconName: "User",
    authRequired: true,
    matchPattern: (p) =>
      p === "/settings" ||
      p.startsWith("/login") ||
      p.startsWith("/register"),
  },
];

const SAFE_RETURN_ORIGIN = "https://teach-player.local";

/**
 * Accept only an in-app path for post-authentication navigation.
 * This blocks protocol-relative URLs, backslashes, auth loops, and API routes.
 */
export function normalizeReturnPath(value: string | null | undefined): string {
  if (!value) return "/";

  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return "/";
  }

  try {
    const url = new URL(candidate, SAFE_RETURN_ORIGIN);
    if (url.origin !== SAFE_RETURN_ORIGIN) return "/";
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return "/";
    if (url.pathname === "/login" || url.pathname === "/register") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
