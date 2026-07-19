// ============================================================
// 双主题色彩系统 — 低饱和暖白 / 墨黑 / 钴蓝
// ============================================================

// ---- 色彩定义 ----

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  glass: string;
  glassRaised: string;
  glassBorder: string;
  border: string;
  text: string;
  muted: string;
  subtle: string;
  accent: string;
  accentDark: string;
  warm: string;
  success: string;
  danger: string;
  gold: string;
  blue: string;
};

// 日间模式
export const lightColors: ThemeColors = {
  background: "#F7F7F5",
  surface: "#FFFFFF",
  surfaceRaised: "#F0F0EC",
  glass: "#FFFFFF",
  glassRaised: "#FAFAF8",
  glassBorder: "rgba(17, 18, 22, 0.08)",
  border: "rgba(17, 18, 22, 0.10)",
  text: "#121318",
  muted: "#71737C",
  subtle: "#B6B7BD",
  accent: "#315EFB",
  accentDark: "#2448C8",
  warm: "#B87532",
  success: "#23845D",
  danger: "#CE3A4B",
  gold: "#B8892D",
  blue: "#315EFB",
};

// 夜间模式
export const darkColors: ThemeColors = {
  background: "#0D0E10",
  surface: "#16171B",
  surfaceRaised: "#202126",
  glass: "#16171B",
  glassRaised: "#1A1B20",
  glassBorder: "rgba(255, 255, 255, 0.09)",
  border: "rgba(255, 255, 255, 0.10)",
  text: "#F5F5F1",
  muted: "#A2A3AC",
  subtle: "#676971",
  accent: "#5878FF",
  accentDark: "#7690FF",
  warm: "#D29A5A",
  success: "#4DBB88",
  danger: "#FF6977",
  gold: "#D3AA54",
  blue: "#5878FF",
};

// ---- 布局常量 ----

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  page: 22,
  card: 16,
  gap: 12,
  lg: 24,
  xl: 32,
} as const;

// ---- 主题类型 ----

export type Theme = {
  colors: ThemeColors;
  radius: typeof radius;
  spacing: typeof spacing;
};

// ---- 完整主题对象 ----

export const lightTheme: Theme = {
  colors: lightColors,
  radius,
  spacing,
};

export const darkTheme: Theme = {
  colors: darkColors,
  radius,
  spacing,
};

// ---- 向后兼容：保留 colors 导出（逐步废弃）----

/** @deprecated 改用 useTheme() hook 获取 theme.colors */
export const colors = darkColors;
