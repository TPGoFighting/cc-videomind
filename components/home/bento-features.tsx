"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FileText, Zap, Lightbulb, MessageSquare, BookOpen, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BentoCard {
  icon: LucideIcon;
  title: string;
  titleZh: string;
  body: string;
  size: "lg" | "md" | "sm" | "wide";
}

const FEATURES: BentoCard[] = [
  {
    icon: FileText,
    title: "Transcript Analysis",
    titleZh: "精准转录",
    body: "所有回答严格基于视频字幕，不凭空捏造。每条引用可追溯到具体时间点，点击即可跳转验证。",
    size: "lg",
  },
  {
    icon: Zap,
    title: "Smart Cache",
    titleZh: "智能缓存",
    body: "同一视频只解析一次，结果缓存 7 天。历史记录永久可查，重复回看不消耗配额。",
    size: "sm",
  },
  {
    icon: Lightbulb,
    title: "Key Moments",
    titleZh: "要点提取",
    body: "AI 自动标记视频中的关键转折点、反常识观点和核心数据，支持中英双语显示。",
    size: "sm",
  },
  {
    icon: MessageSquare,
    title: "Chat Q&A",
    titleZh: "对话问答",
    body: "基于视频内容自由提问，AI 引用具体时间戳作答。跟随式追问，像对话一样自然。",
    size: "sm",
  },
  {
    icon: BookOpen,
    title: "Vocabulary & Review",
    titleZh: "单词本与复习",
    body: "一键收藏视频中的单词和句子，支持间隔复习和闪卡测验，巩固学习效果。",
    size: "sm",
  },
  {
    icon: Sparkles,
    title: "Provider Architecture",
    titleZh: "接口可替换",
    body: "AI 模型、字幕源、支付、存储均采用 Provider 接口设计，可灵活接入不同后端，避免服务锁定。",
    size: "wide",
  },
];

const sizeStyles: Record<string, string> = {
  lg: "md:col-span-2 md:row-span-2",
  md: "md:col-span-1 md:row-span-1",
  sm: "md:col-span-1 md:row-span-1",
  wide: "md:col-span-3",
};

export function BentoFeatures() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".bento-card");
    cards.forEach((card, i) => {
      gsap.fromTo(
        card,
        { opacity: 0, y: 40, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          delay: i * 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    });
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto w-full max-w-full px-4 py-20 sm:max-w-[90%] sm:px-5 sm:py-32 md:max-w-[85%] lg:max-w-[80%]"
    >
      {/* 标题 */}
      <div className="mb-16 text-center space-y-3">
        <span className="inline-block rounded-full border border-white/8 bg-white/[0.02] px-4 py-1.5 text-[12px] font-medium text-[#0099ff] tracking-wider uppercase">
          核心功能
        </span>
        <h2 className="text-[28px] sm:text-[40px] font-bold tracking-tight">
          不只是转录工具
        </h2>
        <p className="text-[15px] text-[#a6a6a6] max-w-lg mx-auto">
          六个核心模块覆盖从视频解析到复习巩固的完整学习闭环
        </p>
      </div>

      {/* Bento 网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 auto-rows-[minmax(180px,auto)]">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className={`bento-card glass rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-500 glass-hover group ${sizeStyles[feature.size]}`}
            >
              {/* 图标 + 标题 */}
              <div>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-colors duration-300 group-hover:border-[#0099ff]/30 group-hover:bg-[#0099ff]/5">
                  <Icon className="h-5 w-5 text-[#0099ff]/60 transition-colors duration-300 group-hover:text-[#0099ff]" />
                </div>
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[#0099ff]/50">
                  {feature.title}
                </span>
                <h3 className="mt-1.5 text-[18px] sm:text-[20px] font-bold tracking-tight">
                  {feature.titleZh}
                </h3>
              </div>

              {/* 描述 */}
              <p className="mt-3 text-[14px] leading-relaxed text-[#a6a6a6] max-w-md">
                {feature.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
