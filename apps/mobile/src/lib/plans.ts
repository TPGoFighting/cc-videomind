import type { SubscriptionTier } from "@/lib/api";

export const planLabels: Record<SubscriptionTier, string> = {
  free: "免费版",
  pro: "专业版",
  max: "旗舰版",
};

export const planDescriptions: Record<SubscriptionTier, string> = {
  free: "适合轻量学习，可体验核心字幕、摘要、问答和基础单词学习。",
  pro: "适合稳定学习，提供更高的视频解析额度和完整复习能力。",
  max: "适合高频学习者，提供更充足的视频解析额度和优先支持。",
};

export type PlanConfig = {
  tier: SubscriptionTier;
  title: string;
  price: number;
  priceLabel: string;
  dailyLimit: number;
  weeklyLimit: number;
  highlighted: boolean;
  description: string;
  features: string[];
};

export const planConfigs = [
  {
    tier: "free",
    title: "Free",
    price: 0,
    priceLabel: "¥0",
    dailyLimit: 3,
    weeklyLimit: 3,
    highlighted: false,
    description: "免费体验核心学习流程，适合先试用和轻量学习。",
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
    title: "Pro",
    price: 15,
    priceLabel: "¥15 / 月",
    dailyLimit: 10,
    weeklyLimit: 30,
    highlighted: true,
    description: "适合稳定学习，解锁完整英语学习与复习系统。",
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
    title: "Max",
    price: 50,
    priceLabel: "¥50 / 月",
    dailyLimit: 30,
    weeklyLimit: 100,
    highlighted: false,
    description: "适合高频学习，保留更充足的学习额度和技术支持。",
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
] as const satisfies PlanConfig[];

export const purchasablePlans = planConfigs.filter((plan) => plan.tier !== "free");

export function getPlanConfig(tier: SubscriptionTier): PlanConfig {
  return planConfigs.find((plan) => plan.tier === tier) ?? planConfigs[0];
}
