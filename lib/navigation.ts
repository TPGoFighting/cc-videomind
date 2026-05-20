/** 底部标签栏导航项 —— 供 web MobileTabBar 和未来 React Native 共用 */

export interface NavItem {
  id: string;
  label: string;
  labelEn: string;
  href: string;
  iconName: "Play" | "Clock" | "BookOpen" | "User";
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
