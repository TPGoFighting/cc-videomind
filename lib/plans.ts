export type SubscriptionTier = "free" | "pro" | "max";

export interface PlanConfig {
  tier: SubscriptionTier;
  name: string;
  nameZh: string;
  price: number; // 月费（人民币）
  dailyLimit: number;
  weeklyLimit: number; // Infinity 表示无限制
  features: string[];
  highlighted: boolean;
}

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    tier: "free",
    name: "Free",
    nameZh: "免费版",
    price: 0,
    dailyLimit: 3,
    weeklyLimit: 7,
    highlighted: false,
    features: [
      "每日 3 次视频分析",
      "每周 7 次",
      "AI 要点时刻提取",
      "AI 结构化摘要",
      "对话式问答",
      "基础单词学习",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    nameZh: "专业版",
    price: 15,
    dailyLimit: 10,
    weeklyLimit: 30,
    highlighted: true,
    features: [
      "每日 10 次视频分析",
      "每周 30 次",
      "AI 要点时刻提取",
      "AI 结构化摘要",
      "对话式问答",
      "完整英语学习功能",
      "间隔重复复习系统",
    ],
  },
  {
    tier: "max",
    name: "Max",
    nameZh: "旗舰版",
    price: 50,
    dailyLimit: 30,
    weeklyLimit: 100,
    highlighted: false,
    features: [
      "每日 30 次视频分析",
      "每周 100 次",
      "AI 要点时刻提取",
      "AI 结构化摘要",
      "对话式问答",
      "完整英语学习功能",
      "间隔重复复习系统",
      "优先技术支持",
    ],
  },
];

/** 根据 tier 查找计划配置 */
export function getPlanConfig(tier: SubscriptionTier): PlanConfig {
  return PLAN_CONFIGS.find((p) => p.tier === tier) ?? PLAN_CONFIGS[0];
}
