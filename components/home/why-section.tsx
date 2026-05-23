"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { EASE } from "@/lib/gsap/constants";

/** 被动观看 — 电视/屏幕图标 */
function IconPassive() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 sm:w-20 sm:h-20" fill="none" stroke="#0099ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      {/* 外屏 */}
      <rect x="6" y="10" width="68" height="48" rx="6" strokeOpacity="0.2" />
      <rect x="9" y="13" width="62" height="42" rx="3" strokeOpacity="0.5" />
      {/* 底座 */}
      <line x1="40" y1="58" x2="40" y2="68" strokeOpacity="0.2" />
      <line x1="26" y1="68" x2="54" y2="68" strokeOpacity="0.2" strokeWidth="1.5" />
      {/* 屏幕内容 — 播放三角 */}
      <polygon points="36,26 36,46 50,36" fill="#0099ff" fillOpacity="0.15" strokeOpacity="0.6" />
      {/* 信号波纹 */}
      <path d="M54 22c6 0 10 5 10 10" strokeOpacity="0.15" strokeWidth="1" />
      <path d="M58 18c10 0 16 7 16 16" strokeOpacity="0.08" strokeWidth="0.8" />
      {/* 装饰散点 */}
      <circle cx="18" cy="22" r="2" fill="#0099ff" fillOpacity="0.2" stroke="none" />
      <circle cx="24" cy="20" r="1.5" fill="#0099ff" fillOpacity="0.12" stroke="none" />
      <circle cx="62" cy="56" r="2" fill="#a855f7" fillOpacity="0.15" stroke="none" />
      {/* 进度条 */}
      <rect x="12" y="53" width="56" height="2" rx="1" strokeOpacity="0.15" fill="white" fillOpacity="0.03" />
      <rect x="12" y="53" width="22" height="2" rx="1" fill="#0099ff" fillOpacity="0.3" stroke="none" />
    </svg>
  );
}

/** 需要结构化 — 大脑/神经图标 */
function IconStructure() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 sm:w-20 sm:h-20" fill="none" stroke="#0099ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      {/* 头部轮廓 */}
      <circle cx="40" cy="36" r="22" strokeOpacity="0.12" />
      <path d="M26 48c2-4 4-6 7-7.5" strokeOpacity="0.15" />
      <path d="M54 48c-2-4-4-6-7-7.5" strokeOpacity="0.15" />
      {/* 神经节点 */}
      <circle cx="30" cy="30" r="3.5" fill="#0099ff" fillOpacity="0.3" stroke="none" />
      <circle cx="50" cy="28" r="3.5" fill="#0099ff" fillOpacity="0.3" stroke="none" />
      <circle cx="40" cy="22" r="3" fill="#0099ff" fillOpacity="0.2" stroke="none" />
      <circle cx="34" cy="44" r="2.5" fill="#a855f7" fillOpacity="0.2" stroke="none" />
      <circle cx="46" cy="42" r="2.5" fill="#a855f7" fillOpacity="0.2" stroke="none" />
      {/* 神经连接线 */}
      <line x1="30" y1="30" x2="40" y2="22" strokeOpacity="0.25" />
      <line x1="50" y1="28" x2="40" y2="22" strokeOpacity="0.25" />
      <line x1="30" y1="30" x2="34" y2="44" strokeOpacity="0.2" />
      <line x1="50" y1="28" x2="46" y2="42" strokeOpacity="0.2" />
      <line x1="34" y1="44" x2="46" y2="42" strokeOpacity="0.2" />
      <line x1="40" y1="22" x2="40" y2="12" strokeOpacity="0.15" />
      {/* 环绕数据流 */}
      <ellipse cx="40" cy="36" rx="28" ry="18" strokeOpacity="0.08" strokeDasharray="3 6" />
      {/* 颈部 */}
      <path d="M34 56c0 4 2 6 6 6s6-2 6-6" strokeOpacity="0.15" />
    </svg>
  );
}

/** Teach Player 解决方案 — 文档+加号图标 */
function IconSolution() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16 sm:w-20 sm:h-20" fill="none" stroke="#0099ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      {/* 文档外框 */}
      <rect x="12" y="6" width="56" height="70" rx="5" strokeOpacity="0.2" />
      {/* 左侧彩条 */}
      <path d="M12 6v70" stroke="#0099ff" strokeWidth="3" strokeOpacity="0.5" />
      <line x1="24" y1="6" x2="24" y2="76" strokeOpacity="0.08" />
      {/* 内容行 */}
      <rect x="28" y="16" width="32" height="8" rx="2" strokeOpacity="0.4" />
      <line x1="28" y1="21" x2="54" y2="21" strokeOpacity="0.15" />
      <rect x="28" y="30" width="24" height="8" rx="2" strokeOpacity="0.3" />
      <line x1="28" y1="35" x2="46" y2="35" strokeOpacity="0.15" />
      <rect x="28" y="44" width="28" height="8" rx="2" strokeOpacity="0.25" />
      <rect x="28" y="58" width="20" height="6" rx="2" strokeOpacity="0.2" />
      {/* 加号 — 核心标志 */}
      <circle cx="58" cy="62" r="8" strokeOpacity="0.4" fill="#0099ff" fillOpacity="0.08" />
      <line x1="58" y1="58" x2="58" y2="66" strokeOpacity="0.7" strokeWidth="1.5" />
      <line x1="54" y1="62" x2="62" y2="62" strokeOpacity="0.7" strokeWidth="1.5" />
      {/* 装饰 */}
      <circle cx="32" cy="68" r="2" fill="#a855f7" fillOpacity="0.2" stroke="none" />
      <circle cx="40" cy="70" r="1.5" fill="#0099ff" fillOpacity="0.15" stroke="none" />
    </svg>
  );
}

const POINTS = [
  {
    icon: <IconPassive />,
    title: "被动观看，看过就忘",
    body: "每天刷几小时 YouTube 教程，但关上页面就记不住关键内容。视频是单向输出，缺少笔记、标注和回顾机制。",
    accent: "#0099ff",
  },
  {
    icon: <IconStructure />,
    title: "需要结构化学习工具",
    body: "真正的学习需要：转录文本参考、AI 要点提取、时间戳笔记和可检索的知识库——这些在普通视频播放器里都没有。",
    accent: "#a855f7",
  },
  {
    icon: <IconSolution />,
    title: "Teach Player 解决了这个问题",
    body: "将任何 YouTube 公开视频变成可交互的学习材料。从转录到复习，一站式覆盖完整学习闭环。",
    accent: "#33adff",
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
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[300px] h-px bg-gradient-to-r from-transparent via-[#0099ff]/30 to-transparent" />

      {/* ─── 背景装饰层 ─── */}
      {/* 左上角大型线框环面 */}
      <div className="absolute -left-[10%] top-[5%] w-[500px] h-[500px] opacity-[0.04] pointer-events-none hidden lg:block">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <ellipse cx="100" cy="100" rx="90" ry="55" fill="none" stroke="#0099ff" strokeWidth="0.4" strokeDasharray="8 4" />
          <ellipse cx="100" cy="100" rx="70" ry="42" fill="none" stroke="#a855f7" strokeWidth="0.3" strokeDasharray="4 6" />
          <ellipse cx="100" cy="100" rx="50" ry="28" fill="none" stroke="#0099ff" strokeWidth="0.5" strokeDasharray="12 5" />
          <ellipse cx="100" cy="100" rx="30" ry="16" fill="none" stroke="#33adff" strokeWidth="0.3" />
          <ellipse cx="100" cy="70" rx="25" ry="10" fill="none" stroke="#0099ff" strokeWidth="0.3" transform="rotate(-15 100 70)" />
        </svg>
      </div>

      {/* 右下角同心圆 */}
      <div className="absolute -right-[5%] bottom-[10%] w-[350px] h-[350px] opacity-[0.04] pointer-events-none hidden lg:block">
        <svg viewBox="0 0 140 140" className="w-full h-full">
          <circle cx="70" cy="70" r="65" fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="10 5" />
          <circle cx="70" cy="70" r="48" fill="none" stroke="#0099ff" strokeWidth="0.4" />
          <circle cx="70" cy="70" r="32" fill="none" stroke="#a855f7" strokeWidth="0.3" strokeDasharray="4 4" />
          <circle cx="70" cy="70" r="16" fill="none" stroke="#0099ff" strokeWidth="0.5" />
          <line x1="70" y1="5" x2="70" y2="135" stroke="#0099ff" strokeWidth="0.2" strokeDasharray="2 8" />
          <line x1="5" y1="70" x2="135" y2="70" stroke="#a855f7" strokeWidth="0.2" strokeDasharray="2 8" />
        </svg>
      </div>

      {/* 中部光晕球 */}
      <div className="absolute top-1/3 left-[40%] -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#0099ff]/[0.015] blur-[120px] pointer-events-none hidden lg:block" />
      <div className="absolute bottom-1/4 right-[5%] w-[300px] h-[300px] rounded-full bg-[#a855f7]/[0.012] blur-[100px] pointer-events-none hidden lg:block" />

      {/* ─── 标题 ─── */}
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

      {/* ═══════════ 桌面端：左右分栏 ═══════════ */}
      {!isMobile && (
        <div className="hidden md:grid md:grid-cols-[1fr_1fr] gap-20 items-start">
          {/* 左侧 sticky */}
          <div ref={leftRef} className="self-start">
            <div className="relative">
              {/* 大幅线框几何装饰 */}
              <div className="absolute -inset-20 opacity-[0.035]">
                <svg viewBox="0 0 280 280" className="w-full h-full">
                  {/* 主环面结构 */}
                  <circle cx="140" cy="140" r="120" fill="none" stroke="#0099ff" strokeWidth="0.5" />
                  <circle cx="140" cy="140" r="95" fill="none" stroke="#a855f7" strokeWidth="0.35" strokeDasharray="8 5" />
                  <circle cx="140" cy="140" r="68" fill="none" stroke="#0099ff" strokeWidth="0.4" />
                  <circle cx="140" cy="140" r="42" fill="none" stroke="#33adff" strokeWidth="0.3" strokeDasharray="5 4" />
                  <circle cx="140" cy="140" r="20" fill="none" stroke="#0099ff" strokeWidth="0.6" />
                  {/* 倾斜环面 */}
                  <ellipse cx="140" cy="140" rx="130" ry="60" fill="none" stroke="#0099ff" strokeWidth="0.2" transform="rotate(-25 140 140)" />
                  <ellipse cx="140" cy="140" rx="80" ry="40" fill="none" stroke="#a855f7" strokeWidth="0.25" transform="rotate(15 140 140)" />
                  {/* 交叉十字线 */}
                  <line x1="140" y1="8" x2="140" y2="272" stroke="#0099ff" strokeWidth="0.15" strokeDasharray="4 12" />
                  <line x1="8" y1="140" x2="272" y2="140" stroke="#a855f7" strokeWidth="0.15" strokeDasharray="4 12" />
                  {/* 四角小装饰 */}
                  <circle cx="48" cy="48" r="8" fill="none" stroke="#0099ff" strokeWidth="0.3" />
                  <circle cx="232" cy="48" r="8" fill="none" stroke="#a855f7" strokeWidth="0.3" />
                  <circle cx="48" cy="232" r="8" fill="none" stroke="#a855f7" strokeWidth="0.3" />
                  <circle cx="232" cy="232" r="8" fill="none" stroke="#0099ff" strokeWidth="0.3" />
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
            {POINTS.map((point, i) => {
              return (
                <div
                  key={point.title}
                  className="why-card glass rounded-2xl p-8 sm:p-10 glass-hover group relative overflow-hidden"
                >
                  {/* 卡片内光晕 */}
                  <div
                    className="absolute -top-1/2 -right-1/2 w-[200px] h-[200px] rounded-full blur-[60px] pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: point.accent, opacity: "0.04" }}
                  />

                  {/* 序号 */}
                  <div className="absolute top-6 right-6 text-[64px] font-extrabold text-white/[0.02] leading-none select-none pointer-events-none tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  <div className="relative flex items-start gap-6">
                    {/* 大号图标 */}
                    <div className="mt-0.5 shrink-0 p-2 rounded-xl border border-white/5 bg-white/[0.02]">
                      {point.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[18px] sm:text-[20px] font-bold tracking-tight mb-3">
                        {point.title}
                      </h4>
                      <p className="text-[15px] leading-relaxed text-[#a6a6a6] max-w-sm">
                        {point.body}
                      </p>
                    </div>
                  </div>

                  {/* 底部装饰线 */}
                  <div className="relative mt-6 pt-4 border-t border-white/[0.03] flex items-center gap-3">
                    <div className="h-1 w-8 rounded-full" style={{ backgroundColor: point.accent, opacity: 0.3 }} />
                    <div className="h-1 w-4 rounded-full bg-white/5" />
                    <div className="h-1 w-2 rounded-full bg-white/3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════ 移动端：纵向排列 ═══════════ */}
      {isMobile && (
        <div className="md:hidden space-y-6">
          {POINTS.map((point, i) => {
            return (
              <div
                key={point.title}
                className="glass rounded-2xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-4 right-4 text-[48px] font-extrabold text-white/[0.02] leading-none select-none pointer-events-none">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="relative flex items-start gap-4">
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
