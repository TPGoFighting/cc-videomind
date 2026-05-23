"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Check } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { getPlanConfig } from "@/lib/plans";
import type { SubscriptionTier } from "@/lib/plans";

interface PlanCard {
  tier: SubscriptionTier;
  highlight: boolean;
  perks: string[];
}

const PLANS: PlanCard[] = [
  {
    tier: "free",
    highlight: false,
    perks: ["每月 5 次视频解析", "基础 AI 摘要与要点", "转录文本查看", "10 条聊天问答", "单词/句子收藏"],
  },
  {
    tier: "pro",
    highlight: true,
    perks: ["每月 100 次视频解析", "完整 AI 摘要与深度要点", "中英双语翻译", "无限聊天问答", "间隔复习系统", "优先 AI 队列"],
  },
  {
    tier: "max",
    highlight: false,
    perks: ["无限视频解析", "全部 Pro 功能", "自定义 AI 配置", "导出笔记到 Anki", "优先支持"],
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { user } = useAuth();

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".pricing-card");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto w-full max-w-full px-4 py-28 sm:max-w-[90%] sm:px-5 sm:py-40 md:max-w-[85%] lg:max-w-[80%]"
    >
      <div className="absolute left-0 top-0 w-[60px] h-px bg-[var(--text-tertiary)]/30" />

      {/* 标题 */}
      <div className="mb-20">
        <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--text-tertiary)]">
          方案
        </span>
      </div>

      {/* 三栏 */}
      <div className="grid gap-12 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const config = getPlanConfig(plan.tier);
          const isCurrentPlan = user && plan.tier === "free";

          return (
            <div key={plan.tier} className="pricing-card">
              {/* 方案名 */}
              <h3 className={`text-[16px] font-[700] tracking-[-0.01em] mb-2 ${plan.highlight ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                {config.nameZh}
                {plan.highlight && (
                  <span className="ml-3 text-[11px] font-[500] tracking-[0.1em] uppercase text-[var(--accent)]/60">
                    推荐
                  </span>
                )}
              </h3>

              {/* 价格 */}
              <div className="mb-6 pb-6 border-b border-[var(--border)]">
                <span className="text-[36px] font-[900] tracking-[-0.02em] text-[var(--text-primary)]">
                  {config.price || "免费"}
                </span>
                {config.price && (
                  <span className="text-[14px] text-[var(--text-tertiary)] ml-1">/月</span>
                )}
              </div>

              {/* 权益 */}
              <ul className="space-y-3 mb-8">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[var(--accent)]/40" />
                    <span className="text-[14px] text-[var(--text-secondary)]">{perk}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentPlan ? (
                <div className="text-[13px] text-[var(--text-tertiary)]">当前方案</div>
              ) : (
                <Link
                  href={plan.tier === "free" ? "/register" : "/subscribe"}
                  className={`inline-block text-[14px] font-[500] transition-colors duration-300 ${
                    plan.highlight
                      ? "text-[var(--accent)] hover:text-[var(--accent)]/70"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {plan.tier === "free" ? "免费注册" : "升级"} →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-16 text-[12px] text-[var(--text-tertiary)]">
        年付享 8 折优惠 · 所有方案可随时取消
      </p>
    </section>
  );
}
