export type SubscriptionTier = "free" | "pro" | "max";

export interface PlanConfig {
  tier: SubscriptionTier;
  name: string;
  nameZh: string;
  /** 人民币；首发没有自动续费。 */
  price: number;
  /** 免费版为 0；付费权益以审核通过起算。 */
  accessDays: number;
  /** 一个权益周期内可解析的不同视频数量。 */
  analysisLimit: number;
  features: string[];
  highlighted: boolean;
}

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    tier: "free",
    name: "Free",
    nameZh: "免费版",
    price: 0,
    accessDays: 0,
    analysisLimit: 3,
    highlighted: false,
    features: [
      "总计 3 次视频分析",
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
    price: 19,
    accessDays: 30,
    analysisLimit: 30,
    highlighted: true,
    features: [
      "30 天内总计 30 次视频分析",
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
    price: 59,
    accessDays: 30,
    analysisLimit: 200,
    highlighted: false,
    features: [
      "30 天内总计 200 次视频分析",
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
