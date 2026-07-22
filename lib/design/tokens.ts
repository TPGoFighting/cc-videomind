/**
 * 设计系统常量
 *
 * 将设计参数编码为可配置常量，确保每个 AI 生成组件
 * 尊重 Teach Player 的 Taste 设计系统，消除跨页面漂移。
 *
 * @module design-tokens
 */

// ============================================================================
// 1. 核心设计旋钮
// ============================================================================

/** 设计变化度（0-1）控制组件的视觉多样性 */
export const DESIGN_VARIANCE = 0.3;

/** 动画强度（0-1）控制过渡和动效的幅度 */
export const MOTION_INTENSITY = 0.5;

/** 视觉密度（0-1）控制信息的紧凑程度 */
export const VISUAL_DENSITY = 0.7;

// ============================================================================
// 2. 颜色系统
// ============================================================================

export const COLORS = {
  /** 主背景色 - 冷调墨黑 */
  background: "#080B0F",

  /** 次要背景色 */
  backgroundSecondary: "#0A1017",

  /** 卡片背景色 */
  card: "#0C131C",

  /** 浮起表面 */
  surfaceRaised: "#111A25",

  /** 边框色 */
  border: "rgba(166, 190, 214, 0.18)",

  /** 强边框色 */
  borderStrong: "rgba(166, 190, 214, 0.32)",

  /** 主文字色 */
  text: "#F4F7FA",

  /** 次要文字色 */
  textSecondary: "#B8C3CE",

  /** 辅助文字色 */
  textMuted: "#9AA8B7",

  /** 最弱文字色；仅用于非关键说明 */
  textFaint: "#718090",

  /** 唯一主行动强调色 */
  accent: "#5BA8FF",

  /** 主行动悬停色 */
  accentHover: "#82BEFF",

  /** 主行动低强调表面 */
  accentSoft: "rgba(91, 168, 255, 0.14)",

  /** 兼容旧调用；红色只表示错误或危险 */
  accentRed: "#FF707A",

  /** 兼容旧调用；黄色只表示警告 */
  accentYellow: "#F2B94B",

  /** 兼容旧调用；蓝色与唯一主强调一致 */
  accentBlue: "#5BA8FF",

  /** 成功色 */
  success: "#58D68D",

  /** 警告色 */
  warning: "#F2B94B",

  /** 错误色 */
  error: "#FF707A",

  /** 同色系强调渐变；禁止引入竞争性紫色 */
  gradient: "linear-gradient(135deg, #5BA8FF 0%, #82BEFF 100%)",
} as const;

// 兼容旧首页组件的点缀序列；全部收敛到同一冰蓝色阶。
export const ACCENT_POINTS = [
  "#5BA8FF",
  "#82BEFF",
  "#3F8FE8",
] as const;

// ============================================================================
// 3. 字体系统
// ============================================================================

export const TYPOGRAPHY = {
  /** 标题字体 */
  fontFamily: "'Satoshi', 'Avenir Next', 'PingFang SC', system-ui, sans-serif",

  /** 正文字体 */
  bodyFontFamily: "'Satoshi', 'Avenir Next', 'PingFang SC', system-ui, sans-serif",

  /** 等宽字体 */
  monoFontFamily: "'JetBrains Mono', monospace",

  /** 字体缩放比例 */
  scale: 1.25,

  /** 字号定义 */
  sizes: {
    xs: "0.75rem",     // 12px
    sm: "0.875rem",    // 14px
    base: "1rem",      // 16px
    lg: "1.125rem",    // 18px
    xl: "1.25rem",     // 20px
    "2xl": "1.5rem",   // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem",  // 36px
  },

  /** 字重 */
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  /** 行高 */
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ============================================================================
// 4. 间距系统
// ============================================================================

export const SPACING = {
  /** 基础单位（4px） */
  unit: 4,

  /** 间距值 */
  values: {
    0: "0",
    1: "0.25rem",   // 4px
    2: "0.5rem",    // 8px
    3: "0.75rem",   // 12px
    4: "1rem",      // 16px
    5: "1.25rem",   // 20px
    6: "1.5rem",    // 24px
    8: "2rem",      // 32px
    10: "2.5rem",   // 40px
    12: "3rem",     // 48px
    16: "4rem",     // 64px
    20: "5rem",     // 80px
    24: "6rem",     // 96px
  },
} as const;

// ============================================================================
// 5. 圆角系统
// ============================================================================

export const BORDER_RADIUS = {
  /** 无圆角 */
  none: "0",

  /** 小圆角（按钮、输入框） */
  sm: "0.375rem",   // 6px

  /** 中圆角（卡片） */
  md: "0.625rem",   // 10px

  /** 大圆角（模态框） */
  lg: "0.875rem",   // 14px

  /** 大型工作区与对话框 */
  xl: "1.25rem",    // 20px

  /** 全圆角（头像、标签） */
  full: "9999px",
} as const;

// ============================================================================
// 6. 阴影系统
// ============================================================================

export const SHADOWS = {
  /** 无阴影 */
  none: "none",

  /** 小阴影 */
  sm: "0 1px 2px rgba(0, 0, 0, 0.24)",

  /** 中阴影 */
  md: "0 14px 36px rgba(0, 0, 0, 0.28)",

  /** 大阴影 */
  lg: "0 28px 72px rgba(0, 0, 0, 0.42)",

  /** 聚焦阴影 */
  focus: "0 0 0 3px rgba(91, 168, 255, 0.34)",
} as const;

// ============================================================================
// 7. 动画系统
// ============================================================================

export const ANIMATION = {
  /** 持续时间 */
  durations: {
    fast: "120ms",
    normal: "200ms",
    slow: "360ms",
  },

  /** 缓动函数 */
  easings: {
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
  },

  /** 交互反馈 */
  transitions: {
    colors: "color 150ms ease, background-color 150ms ease, border-color 150ms ease",
    transform: "transform 150ms ease",
    shadow: "box-shadow 150ms ease",
    all: "all 150ms ease",
  },
} as const;

// ============================================================================
// 8. 断点系统
// ============================================================================

export const BREAKPOINTS = {
  /** 移动端 */
  sm: "640px",

  /** 平板 */
  md: "768px",

  /** 小桌面 */
  lg: "1024px",

  /** 大桌面 */
  xl: "1280px",

  /** 超大屏 */
  "2xl": "1536px",
} as const;

// ============================================================================
// 9. 对比度要求
// ============================================================================

export const CONTRAST = {
  /** WCAG AA 标准 */
  aa: 4.5,

  /** WCAG AAA 标准 */
  aaa: 7,

  /** 大文本 AA 标准 */
  aaLarge: 3,

  /** 大文本 AAA 标准 */
  aaaLarge: 4.5,
} as const;

// ============================================================================
// 10. 反 AI 味规则
// ============================================================================

/** 禁止在 AI 生成内容中使用的模式 */
export const ANTI_AI_SLOP = {
  /** 禁止的颜色渐变 */
  forbiddenGradients: [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",  // 紫色渐变
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",  // 粉色渐变
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",  // 青色渐变
  ],

  /** 禁止的词汇 */
  forbiddenWords: [
    "赋能",
    "生态",
    "重新定义",
    "颠覆",
    "革命性",
    "突破性",
    "无缝",
    "端到端",
    "一站式",
    "全方位",
  ],

  /** 禁止的标点符号 */
  forbiddenPunctuation: [
    "—",  // em-dash（过度使用）
  ],

  /** 推荐的替代词汇 */
  recommendedAlternatives: {
    "赋能": "帮助、支持",
    "生态": "系统、体系",
    "重新定义": "改进、优化",
    "颠覆": "改变、革新",
    "革命性": "重大的、显著的",
    "突破性": "创新的、先进的",
    "无缝": "流畅的、平滑的",
    "端到端": "完整的、全流程的",
    "一站式": "综合的、集成的",
    "全方位": "全面的、多维度的",
  },
} as const;

// ============================================================================
// 11. 组件设计约束
// ============================================================================

/** 组件设计约束 */
export const COMPONENT_CONSTRAINTS = {
  /** 卡片最大宽度 */
  cardMaxWidth: "400px",

  /** 按钮最小高度 */
  buttonMinHeight: "44px",

  /** 输入框最小高度 */
  inputMinHeight: "40px",

  /** 头像尺寸 */
  avatarSizes: {
    sm: "24px",
    md: "32px",
    lg: "48px",
    xl: "64px",
  },

  /** 图标尺寸 */
  iconSizes: {
    sm: "16px",
    md: "20px",
    lg: "24px",
    xl: "32px",
  },
} as const;

// ============================================================================
// 12. 导出所有常量
// ============================================================================

export const DESIGN_TOKENS = {
  DESIGN_VARIANCE,
  MOTION_INTENSITY,
  VISUAL_DENSITY,
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATION,
  BREAKPOINTS,
  CONTRAST,
  ANTI_AI_SLOP,
  COMPONENT_CONSTRAINTS,
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
