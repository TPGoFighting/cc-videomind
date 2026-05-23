"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Crown, Check, Zap } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { getPlanConfig } from "@/lib/plans";
import type { SubscriptionTier } from "@/lib/plans";
import { STAGGER } from "@/lib/gsap/constants";

interface PlanCard {
  tier: SubscriptionTier;
  icon: typeof Crown;
  highlight: boolean;
  perks: string[];
}

const PLANS: PlanCard[] = [
  {
    tier: "free",
    icon: Zap,
    highlight: false,
    perks: [
      "每月 5 次视频解析",
      "基础 AI 摘要与要点",
      "转录文本查看",
      "10 条聊天问答",
      "单词/句子收藏",
    ],
  },
  {
    tier: "pro",
    icon: Crown,
    highlight: true,
    perks: [
      "每月 100 次视频解析",
      "完整 AI 摘要与深度要点",
      "中英双语翻译",
      "无限聊天问答",
      "间隔复习系统",
      "优先 AI 队列",
    ],
  },
  {
    tier: "max",
    icon: Crown,
    highlight: false,
    perks: [
      "无限视频解析",
      "全部 Pro 功能",
      "自定义 AI 配置",
      "导出笔记到 Anki",
      "团队共享功能（即将推出）",
      "优先支持",
    ],
  },
];

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // 卡片交错入场
  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".pricing-card");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 60 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "back.out(1.2)",
        stagger: STAGGER.loose,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: sectionRef });

  // Pro 卡光晕脉冲
  useGSAP(() => {
    gsap.to(".pricing-highlight", {
      boxShadow: "0 0 40px rgba(0,153,255,0.2), 0 0 80px rgba(168,85,247,0.1)",
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, { scope: sectionRef });

  // 3D 倾斜效果
  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".pricing-card-3d");
    const cleanupFns: (() => void)[] = [];

    cards.forEach((card) => {
      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: x * 8,
          rotateX: -y * 8,
          duration: 0.5,
          ease: "power2.out",
        });
      };
      const onLeave = () => {
        gsap.to(card, {
          rotateY: 0,
          rotateX: 0,
          duration: 0.9,
          ease: "elastic.out(1, 0.4)",
        });
      };

      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      cleanupFns.push(() => {
        card.removeEventListener("mousemove", onMove);
        card.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => cleanupFns.forEach((fn) => fn());
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto w-full max-w-full px-4 py-24 sm:max-w-[90%] sm:px-5 sm:py-32 md:max-w-[85%] lg:max-w-[80%]"
    >
      {/* 背景分割线 */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#0099ff]/20 to-transparent" />

      {/* 标题 */}
      <div className="mb-16 text-center space-y-3">
        <span className="inline-block rounded-full border border-white/8 bg-white/[0.02] px-4 py-1.5 text-[12px] font-medium text-amber-400 tracking-wider uppercase">
          订阅方案
        </span>
        <h2 className="text-[28px] sm:text-[40px] font-bold tracking-tight">
          选择适合你的
          <span className="text-gradient"> 学习方式</span>
        </h2>
        <p className="text-[15px] text-[#a6a6a6] max-w-lg mx-auto">
          从免费开始，按需升级。所有方案都包含核心转录分析功能。
        </p>
      </div>

      {/* 三栏定价卡 */}
      <div ref={containerRef} className="grid gap-6 lg:grid-cols-3 lg:gap-5" style={{ perspective: "1200px" }}>
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const config = getPlanConfig(plan.tier);
          const isCurrentPlan = user && plan.tier === "free";

          return (
            <div
              key={plan.tier}
              className={`pricing-card pricing-card-3d relative rounded-2xl border p-6 sm:p-8 flex flex-col transition-shadow duration-500 ${
                plan.highlight
                  ? "pricing-highlight border-[#0099ff]/25 bg-[#0099ff]/[0.03]"
                  : "border-white/6 bg-[#0a0a0a]/80 backdrop-blur-sm"
              }`}
              style={{
                transformStyle: "preserve-3d",
                transform: "rotateY(0deg) rotateX(0deg)",
              }}
            >
              {/* 推荐标签 */}
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#0099ff] to-[#a855f7] px-5 py-1 text-[11px] font-bold text-white tracking-wider shadow-[0_0_20px_rgba(0,153,255,0.3)]">
                  推荐
                </div>
              )}

              {/* 方案名 + 图标 */}
              <div className="flex items-center gap-2 mb-3">
                <Icon
                  className={`h-5 w-5 ${
                    plan.highlight ? "text-[#0099ff]" : "text-white/40"
                  }`}
                />
                <h3 className="text-[15px] font-semibold tracking-tight">
                  {config.nameZh}
                </h3>
              </div>

              {/* 价格 */}
              <div className="mb-6">
                <span className={`text-[40px] font-extrabold tracking-[-0.02em] leading-none ${plan.highlight ? "text-gradient" : "text-white"}`}>
                  {config.price || "免费"}
                </span>
                {config.price && (
                  <span className="text-[14px] text-white/30 ml-1">/月</span>
                )}
              </div>

              {/* 权益列表 */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5">
                    <Check className={`h-4 w-4 mt-0.5 shrink-0 ${plan.highlight ? "text-[#0099ff]" : "text-[#0099ff]/50"}`} />
                    <span className="text-[13px] text-[#a6a6a6]">{perk}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentPlan ? (
                <div className="w-full rounded-full border border-white/8 bg-white/[0.02] py-2.5 text-center text-[13px] font-medium text-white/30">
                  当前方案
                </div>
              ) : (
                <Link
                  href={plan.tier === "free" ? "/register" : "/subscribe"}
                  className={`block w-full rounded-full py-2.5 text-center text-[13px] font-medium transition-all duration-300 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-[#0099ff] to-[#33adff] text-white hover:shadow-[0_0_25px_rgba(0,153,255,0.3)]"
                      : "border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {plan.tier === "free" ? "免费注册" : "升级方案"}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部说明 */}
      <p className="mt-10 text-center text-[12px] text-white/20">
        年付享 8 折优惠 · 所有方案可随时取消 · 30 天无理由退款
      </p>
    </section>
  );
}
