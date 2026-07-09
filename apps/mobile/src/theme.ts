// ============================================================
// 双主题色彩系统 — 黑/白高级风格
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
  background: "#F2F2F7",
  surface: "#FFFFFF",
  surfaceRaised: "#F1F3F5",
  glass: "rgba(255, 255, 255, 0.72)",
  glassRaised: "rgba(255, 255, 255, 0.85)",
  glassBorder: "rgba(0, 0, 0, 0.05)",
  border: "rgba(0, 0, 0, 0.08)",
  text: "#1C1C1E",
  muted: "#8E8E93",
  subtle: "#C7C7CC",
  accent: "#58CC02",
  accentDark: "#46A302",
  warm: "#FF9F1C",
  success: "#58CC02",
  danger: "#FF3B30",
  gold: "#FFC800",
  blue: "#007AFF",
};

// 夜间模式
export const darkColors: ThemeColors = {
  background: "#000000",
  surface: "#1C1C1E",
  surfaceRaised: "#2C2C2E",
  glass: "rgba(28, 28, 30, 0.65)",
  glassRaised: "rgba(44, 44, 46, 0.75)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#F2F2F7",
  muted: "#8E8E93",
  subtle: "#636366",
  accent: "#58CC02",
  accentDark: "#46A302",
  warm: "#FF9F1C",
  success: "#58CC02",
  danger: "#FF453A",
  gold: "#FFC800",
  blue: "#0A84FF",
};

// ---- 布局常量 ----

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  page: 20,
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
