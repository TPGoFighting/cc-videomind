"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  FileText,
  Zap,
  Lightbulb,
  MessageSquare,
  Sparkles,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ACCENT_POINTS } from "@/lib/design/tokens";

interface FeatureCard {
  icon: LucideIcon;
  emoji: string;
  title: string;
  titleZh: string;
  body: string;
  illustration: React.ReactNode;
}

const FEATURES: FeatureCard[] = [
  {
    icon: FileText,
    emoji: "📝",
    title: "Transcript Analysis",
    titleZh: "精准转录",
    body: "所有回答严格基于视频字幕，不凭空捏造。每条引用可追溯到具体时间点，点击跳转。",
    illustration: (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
        <rect x="14" y="6" width="36" height="52" rx="3" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.25" />
        <rect x="18" y="12" width="28" height="6" rx="1" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.45" />
        <line x1="18" y1="16" x2="42" y2="16" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.3" />
        <rect x="18" y="24" width="28" height="6" rx="1" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.35" />
        <line x1="18" y1="28" x2="38" y2="28" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.25" />
        <rect x="18" y="36" width="20" height="6" rx="1" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.25" />
        <line x1="18" y1="40" x2="34" y2="40" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.2" />
        <path d="M30 46l3 3 5-6" stroke="#0099ff" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    icon: Zap,
    emoji: "⚡",
    title: "Smart Cache",
    titleZh: "智能缓存",
    body: "同一视频只解析一次，结果缓存 7 天。历史记录永久可查，重复回看不消耗配额。",
    illustration: (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
        <circle cx="32" cy="32" r="20" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.2" />
        <circle cx="32" cy="32" r="14" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="3 2" />
        <path d="M32 18v5M32 41v5M18 32h5M41 32h5" stroke="#0099ff" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round" />
        <path d="M28 26l4 6 4-6" stroke="#0099ff" strokeWidth="1.5" strokeOpacity="0.55" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 38l4-6 4 6" stroke="#0099ff" strokeWidth="1.5" strokeOpacity="0.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    icon: Lightbulb,
    emoji: "💡",
    title: "Key Moments",
    titleZh: "要点提取",
    body: "AI 自动标记视频中的关键转折点、反常识观点和核心数据，支持中英双语显示。",
    illustration: (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
        <circle cx="32" cy="38" r="16" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.15" />
        <path d="M24 28c0-4.4 3.6-8 8-8s8 3.6 8 8c0 3-1.5 5.5-4 6.8V38h-8v-3.2c-2.5-1.3-4-3.8-4-6.8z" stroke="#0099ff" strokeWidth="1.3" strokeOpacity="0.5" />
        <line x1="28" y1="42" x2="36" y2="42" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.4" strokeLinecap="round" />
        <line x1="30" y1="46" x2="34" y2="46" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.3" strokeLinecap="round" />
        <circle cx="32" cy="22" r="2.5" fill="#0099ff" fillOpacity="0.25" stroke="none" />
        <line x1="32" y1="18" x2="32" y2="14" stroke="#0099ff" strokeWidth="1" strokeOpacity="0.2" strokeLinecap="round" />
        <line x1="23" y1="20" x2="20" y2="17" stroke="#0099ff" strokeWidth="1" strokeOpacity="0.15" strokeLinecap="round" />
        <line x1="41" y1="20" x2="44" y2="17" stroke="#0099ff" strokeWidth="1" strokeOpacity="0.15" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    icon: MessageSquare,
    emoji: "💬",
    title: "Chat Q&A",
    titleZh: "对话问答",
    body: "基于视频内容自由提问，AI 引用具体时间戳作答。支持跟随式追问，像对话一样自然。",
    illustration: (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
        <rect x="10" y="14" width="44" height="32" rx="6" stroke="#0099ff" strokeWidth="1.3" strokeOpacity="0.4" />
        <path d="M16 50l-4 6h40l-4-6" stroke="#0099ff" strokeWidth="1" strokeOpacity="0.15" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="30" r="2" fill="#0099ff" fillOpacity="0.4" stroke="none" />
        <circle cx="32" cy="30" r="2" fill="#0099ff" fillOpacity="0.4" stroke="none" />
        <circle cx="40" cy="30" r="2" fill="#0099ff" fillOpacity="0.4" stroke="none" />
      </svg>
    ),
  },
  {
    icon: BookOpen,
    emoji: "📖",
    title: "Vocabulary & Quotes",
    titleZh: "单词句子本",
    body: "一键收藏视频中的单词和句子，支持间隔复习和闪卡测验，巩固学习效果。",
    illustration: (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
        <path d="M16 10h26a4 4 0 014 4v36a4 4 0 01-4-4V14H18a2 2 0 000 4h28" stroke="#0099ff" strokeWidth="1.3" strokeOpacity="0.45" strokeLinecap="round" />
        <path d="M16 10v44" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.3" strokeLinecap="round" />
        <line x1="22" y1="22" x2="36" y2="22" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.25" strokeLinecap="round" />
        <line x1="22" y1="28" x2="34" y2="28" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.2" strokeLinecap="round" />
        <line x1="22" y1="34" x2="30" y2="34" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.15" strokeLinecap="round" />
        <rect x="44" y="38" width="12" height="16" rx="2" stroke="#0099ff" strokeWidth="1" strokeOpacity="0.25" />
        <line x1="47" y1="44" x2="53" y2="44" stroke="#0099ff" strokeWidth="0.7" strokeOpacity="0.2" strokeLinecap="round" />
        <line x1="47" y1="48" x2="51" y2="48" stroke="#0099ff" strokeWidth="0.7" strokeOpacity="0.15" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    icon: Sparkles,
    emoji: "✨",
    title: "Provider Design",
    titleZh: "接口可替换",
    body: "AI 模型、字幕源、支付、存储均采用 Provider 接口设计，可灵活接入不同后端。",
    illustration: (
      <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none">
        <rect x="14" y="14" width="16" height="16" rx="3" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.4" />
        <rect x="34" y="14" width="16" height="16" rx="3" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.25" />
        <rect x="14" y="34" width="16" height="16" rx="3" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.3" />
        <rect x="34" y="34" width="16" height="16" rx="3" stroke="#0099ff" strokeWidth="1.2" strokeOpacity="0.35" />
        <line x1="22" y1="30" x2="22" y2="34" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.3" />
        <line x1="42" y1="30" x2="42" y2="34" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.3" />
        <line x1="30" y1="22" x2="34" y2="22" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.3" />
        <line x1="30" y1="42" x2="34" y2="42" stroke="#0099ff" strokeWidth="0.8" strokeOpacity="0.3" />
      </svg>
    ),
  },
];

export function FeaturesScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 横向滚动（桌面端）
  useGSAP(() => {
    if (isMobile || !trackRef.current) return;

    const cards = gsap.utils.toArray<HTMLElement>(".feature-card");
    const totalMove =
      cards.reduce((sum, c) => sum + c.offsetWidth + 24, 0) -
      (trackRef.current.parentElement?.clientWidth ?? window.innerWidth) +
      80;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        pin: true,
        scrub: 1.2,
        start: "top top",
        end: () => `+=${totalMove + 400}`,
      },
    });

    tl.to(trackRef.current, {
      x: () => -Math.max(0, totalMove),
      ease: "none",
    });

    // 进度条
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: () => `+=${totalMove + 400}`,
      onUpdate: (self) => {
        if (progressRef.current) {
          progressRef.current.style.width = `${self.progress * 100}%`;
        }
      },
    });
  }, { scope: sectionRef, dependencies: [isMobile], revertOnUpdate: true });

  // 移动端卡片进入视口时的细腻 stagger + 形变
  useGSAP(() => {
    if (!isMobile) return;
    const cards = gsap.utils.toArray<HTMLElement>(".feature-card-mobile");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 28, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: sectionRef, dependencies: [isMobile] });

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto w-full max-w-full overflow-hidden"
    >
      {/* 标题区 */}
      <div className="px-4 mb-10 text-center sm:max-w-[90%] sm:px-5 sm:mb-14 md:max-w-[85%] lg:max-w-[80%] mx-auto">
        <span className="inline-block rounded-full border border-white/8 bg-white/[0.02] px-4 py-1.5 text-[12px] font-medium text-[#0099ff] tracking-wider uppercase mb-4">
          核心功能
        </span>
        <h2 className="text-[24px] font-bold tracking-tight sm:text-[34px]">
          不只是转录工具
        </h2>
        <p className="mt-3 text-[15px] text-[#a6a6a6] max-w-lg mx-auto">
          六个核心模块覆盖从视频解析到复习巩固的完整学习闭环
        </p>
      </div>

      {/* 桌面端：横向滚动 */}
      {!isMobile && (
        <div className="hidden md:block">
          <div className="px-4 sm:max-w-[90%] sm:px-5 md:max-w-[85%] lg:max-w-[80%] mx-auto overflow-hidden">
            <div
              ref={trackRef}
              className="flex gap-6 py-6"
              style={{ willChange: "transform" }}
            >
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                const accent = ACCENT_POINTS[i % ACCENT_POINTS.length];
                return (
                  <div
                    key={feature.title}
                    className="feature-card card-lift flex-shrink-0 w-[340px] lg:w-[380px] rounded-2xl border border-white/6 bg-[#0a0a0a] p-8"
                  >
                    <div className="mb-6">{feature.illustration}</div>
                    <div
                      className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border"
                      style={{ borderColor: `${accent}40`, backgroundColor: `${accent}12` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: accent }} />
                    </div>
                    <h3 className="text-[11px] font-semibold tracking-widest uppercase text-[#0099ff]/60 mb-1">
                      {feature.title}
                    </h3>
                    <h4 className="text-[18px] font-bold tracking-tight mb-3">
                      {feature.titleZh}
                    </h4>
                    <p className="text-[14px] leading-relaxed text-[#a6a6a6]">
                      {feature.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          {/* 进度条 */}
          <div className="mx-auto mt-8 h-[2px] w-full max-w-[80%] rounded-full bg-white/5">
            <div
              ref={progressRef}
              className="h-full rounded-full bg-[#0099ff]/50 transition-[width]"
              style={{ width: "0%" }}
            />
          </div>
        </div>
      )}

      {/* 移动端：纵向网格 */}
      {isMobile && (
        <div className="md:hidden px-4 pb-20 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            const accent = ACCENT_POINTS[i % ACCENT_POINTS.length];
            return (
              <div
                key={feature.title}
                className="feature-card-mobile rounded-2xl border border-white/6 bg-[#0a0a0a] p-6"
              >
                <div className="mb-4">{feature.illustration}</div>
                <div
                  className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border"
                  style={{ borderColor: `${accent}40`, backgroundColor: `${accent}12` }}
                >
                  <Icon className="h-4 w-4" style={{ color: accent }} />
                </div>
                <h4 className="text-[16px] font-bold tracking-tight mb-2">
                  {feature.titleZh}
                </h4>
                <p className="text-[13px] leading-relaxed text-[#a6a6a6]">
                  {feature.body}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
