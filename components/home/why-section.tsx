"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { EASE } from "@/lib/gsap/constants";

const POINTS = [
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="#0099ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="40" height="28" rx="4" strokeOpacity="0.3" />
        <rect x="6" y="8" width="36" height="24" rx="2" strokeOpacity="0.6" />
        <line x1="24" y1="36" x2="24" y2="42" strokeOpacity="0.25" />
        <line x1="16" y1="42" x2="32" y2="42" strokeOpacity="0.25" />
        <line x1="18" y1="16" x2="30" y2="26" strokeOpacity="0.5" strokeWidth="1.2" />
        <line x1="30" y1="16" x2="18" y2="26" strokeOpacity="0.5" strokeWidth="1.2" />
        <circle cx="24" cy="21" r="9" fill="none" strokeOpacity="0.15" />
      </svg>
    ),
    title: "被动观看，看过就忘",
    body: "每天刷几小时 YouTube 教程，但关上页面就记不住关键内容。视频是单向输出，缺少笔记、标注和回顾机制。",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="#0099ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="22" r="13" strokeOpacity="0.12" />
        <path d="M17 28c2.5-3 5-4.5 7-4.5s4.5 1.5 7 4.5" strokeOpacity="0.55" />
        <path d="M24 8v5M24 31v5M10 22H5M43 22h-5" strokeOpacity="0.18" strokeWidth="1" />
        <circle cx="19" cy="18" r="2" fill="#0099ff" fillOpacity="0.45" stroke="none" />
        <circle cx="29" cy="18" r="2" fill="#0099ff" fillOpacity="0.45" stroke="none" />
        <path d="M18 11l-3-4M30 11l3-4" strokeOpacity="0.12" strokeWidth="0.8" />
        <path d="M14 16l-4-2M34 16l4-2" strokeOpacity="0.2" strokeWidth="0.8" />
      </svg>
    ),
    title: "需要结构化学习工具",
    body: "真正的学习需要：转录文本参考、AI 要点提取、时间戳笔记和可检索的知识库——这些在普通视频播放器里都没有。",
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="#0099ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="4" width="34" height="42" rx="4" strokeOpacity="0.25" />
        <line x1="17" y1="4" x2="17" y2="46" strokeOpacity="0.12" />
        <rect x="20" y="9" width="20" height="10" rx="2" strokeOpacity="0.5" />
        <line x1="20" y1="16" x2="36" y2="16" strokeOpacity="0.25" />
        <rect x="20" y="23" width="20" height="10" rx="2" strokeOpacity="0.4" />
        <line x1="20" y1="30" x2="32" y2="30" strokeOpacity="0.25" />
        <rect x="20" y="37" width="14" height="8" rx="2" strokeOpacity="0.3" />
        <circle cx="38" cy="41" r="4" strokeOpacity="0.55" />
        <line x1="38" y1="39" x2="38" y2="43" strokeOpacity="0.55" />
        <line x1="36" y1="41" x2="40" y2="41" strokeOpacity="0.55" />
        <path d="M20 4v42" stroke="#0099ff" strokeWidth="2" strokeOpacity="0.5" />
      </svg>
    ),
    title: "Teach Player 解决了这个问题",
    body: "将任何 YouTube 公开视频变成可交互的学习材料。从转录到复习，一站式覆盖完整学习闭环。",
  },
];

export function WhySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 桌面端：左侧 sticky + 右侧卡片随滚动切换
  useGSAP(() => {
    if (isMobile) return;

    const cards = gsap.utils.toArray<HTMLElement>(".why-card");
    ScrollTrigger.create({
      trigger: trackRef.current,
      start: "top top",
      end: "bottom bottom",
      pin: leftRef.current,
      pinSpacing: false,
    });

    cards.forEach((card) => {
      gsap.fromTo(
        card,
        { opacity: 0.15, scale: 0.92, y: 60 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.8,
          ease: EASE.out,
          scrollTrigger: {
            trigger: card,
            start: "top 72%",
            end: "top 28%",
            scrub: 0.6,
          },
        }
      );
    });
  }, { scope: sectionRef, dependencies: [isMobile], revertOnUpdate: true });

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto w-full max-w-full px-4 py-24 sm:max-w-[90%] sm:px-5 sm:py-32 md:max-w-[85%] lg:max-w-[80%]"
    >
      {/* 背景分割线 */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#0099ff]/20 to-transparent" />

      {/* 标题 */}
      <div className="mb-16 text-center space-y-3">
        <span className="inline-block rounded-full border border-white/8 bg-white/[0.02] px-4 py-1.5 text-[12px] font-medium text-[#0099ff] tracking-wider uppercase">
          为什么做这个
        </span>
        <h2 className="text-[28px] sm:text-[40px] font-bold tracking-tight">
          从被动观看
          <span className="text-gradient"> 到主动学习</span>
        </h2>
        <p className="text-[15px] text-[#a6a6a6] max-w-lg mx-auto">
          YouTube 是最好的免费大学，但缺少一个真正的学习工具。Teach Player 填补了这个空白。
        </p>
      </div>

      {/* 桌面端：左右分栏 */}
      {!isMobile && (
        <div className="hidden md:grid md:grid-cols-[1fr_1fr] gap-20 items-start">
          {/* 左侧 sticky */}
          <div ref={leftRef} className="self-start">
            <div className="relative">
              {/* 装饰性几何图形 */}
              <div className="absolute -inset-16 opacity-[0.03]">
                <svg viewBox="0 0 240 240" className="w-full h-full">
                  <circle cx="120" cy="120" r="100" fill="none" stroke="#0099ff" strokeWidth="0.5" />
                  <circle cx="120" cy="120" r="72" fill="none" stroke="#0099ff" strokeWidth="0.3" />
                  <circle cx="120" cy="120" r="44" fill="none" stroke="#a855f7" strokeWidth="0.4" strokeDasharray="6 4" />
                  <circle cx="120" cy="120" r="20" fill="none" stroke="#0099ff" strokeWidth="0.6" />
                  <ellipse cx="120" cy="120" rx="90" ry="50" fill="none" stroke="#0099ff" strokeWidth="0.2" transform="rotate(-20 120 120)" />
                  <ellipse cx="120" cy="120" rx="60" ry="35" fill="none" stroke="#a855f7" strokeWidth="0.25" transform="rotate(15 120 120)" />
                </svg>
              </div>
              <div className="relative space-y-8">
                <h3 className="text-[24px] sm:text-[32px] font-bold tracking-[-0.02em] leading-[1.15]">
                  大多数 YouTube 学习
                  <br />
                  <span className="text-gradient">停留在&ldquo;看&rdquo;</span>
                </h3>
                <p className="text-[16px] leading-relaxed text-[#a6a6a6] max-w-sm">
                  视频是单向的。你需要一个能够提取知识、组织笔记、提供问答和复习提醒的学习工作区——而这正是 Teach Player 的核心。
                </p>
                <div className="flex items-center gap-4 pt-4">
                  <div className="flex -space-x-3">
                    {["bg-[#0099ff]", "bg-[#33adff]", "bg-[#66ccff]", "bg-[#99d6ff]"].map((color, i) => (
                      <div key={i} className={`w-9 h-9 rounded-full ${color} border-2 border-black opacity-55`} />
                    ))}
                  </div>
                  <span className="text-[13px] text-white/30">超过 12000 名学习者</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧滚动卡片 */}
          <div ref={trackRef} className="space-y-[70vh]">
            {POINTS.map((point) => {
              return (
                <div
                  key={point.title}
                  className="why-card glass rounded-2xl p-8 sm:p-10 glass-hover"
                >
                  <div className="flex items-start gap-5">
                    <div className="mt-1 shrink-0">{point.icon}</div>
                    <div>
                      <h4 className="text-[18px] sm:text-[20px] font-bold tracking-tight mb-3">
                        {point.title}
                      </h4>
                      <p className="text-[15px] leading-relaxed text-[#a6a6a6]">
                        {point.body}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 移动端：纵向排列 */}
      {isMobile && (
        <div className="md:hidden space-y-6">
          {POINTS.map((point) => {
            return (
              <div
                key={point.title}
                className="glass rounded-2xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 shrink-0">{point.icon}</div>
                  <div>
                    <h4 className="text-[16px] font-semibold tracking-tight mb-2">
                      {point.title}
                    </h4>
                    <p className="text-[14px] leading-relaxed text-[#a6a6a6]">
                      {point.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
