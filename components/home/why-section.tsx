"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { GlbDecoration } from "@/components/glb-decoration";
import { GLB_MODELS } from "@/lib/glb-models";
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

/** 桌面端 3 个场景的模型配置 */
interface SceneConfig {
  model: string;
  side: "left" | "right";
  targetSize: number;
  glow: string;
  /** 辅助模型（可选），放在同侧偏下位置 */
  secondary?: { model: string; targetSize: number };
}

const SCENES: SceneConfig[] = [
  { model: GLB_MODELS.stork, side: "left" as const, targetSize: 4.5, glow: "bg-[#a855f7]/[0.07]", secondary: { model: GLB_MODELS.table, targetSize: 2.4 } },
  { model: GLB_MODELS.flamingo, side: "right" as const, targetSize: 4.0, glow: "bg-[#0099ff]/[0.07]" },
  { model: GLB_MODELS.parrot, side: "left" as const, targetSize: 4.0, glow: "bg-[#a855f7]/[0.07]" },
];

export function WhySection() {
  const sectionRef = useRef<HTMLElement>(null);
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

  // 桌面端：卡片滚动淡入
  useGSAP(() => {
    if (isMobile) return;

    const cards = gsap.utils.toArray<HTMLElement>(".why-card");
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
            start: "top 78%",
            end: "top 32%",
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
      {/* 左侧线框环面 */}
      <div className="absolute -left-[10%] top-[10%] w-[500px] h-[500px] opacity-[0.025] pointer-events-none hidden lg:block">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <ellipse cx="100" cy="100" rx="90" ry="55" fill="none" stroke="#0099ff" strokeWidth="0.4" strokeDasharray="8 4" />
          <ellipse cx="100" cy="100" rx="70" ry="42" fill="none" stroke="#a855f7" strokeWidth="0.3" strokeDasharray="4 6" />
          <ellipse cx="100" cy="100" rx="50" ry="28" fill="none" stroke="#0099ff" strokeWidth="0.5" strokeDasharray="12 5" />
        </svg>
      </div>
      {/* 右下角同心圆 */}
      <div className="absolute -right-[5%] bottom-[5%] w-[350px] h-[350px] opacity-[0.03] pointer-events-none hidden lg:block">
        <svg viewBox="0 0 140 140" className="w-full h-full">
          <circle cx="70" cy="70" r="65" fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="10 5" />
          <circle cx="70" cy="70" r="48" fill="none" stroke="#0099ff" strokeWidth="0.4" />
          <circle cx="70" cy="70" r="32" fill="none" stroke="#a855f7" strokeWidth="0.3" strokeDasharray="4 4" />
          <circle cx="70" cy="70" r="16" fill="none" stroke="#0099ff" strokeWidth="0.5" />
        </svg>
      </div>

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

      {/* ═══════════ 桌面端：沉浸式场景流 ═══════════ */}
      {!isMobile && (
        <div ref={trackRef} className="hidden md:block">
          {POINTS.flatMap((point, i) => {
            const scene = SCENES[i];
            const isModelLeft = scene.side === "left";

            const cardEl = (
              <div
                className={`why-card glass rounded-2xl p-8 sm:p-10 glass-hover group relative overflow-hidden ${
                  isModelLeft ? "ml-auto mr-[2%]" : "mr-auto ml-[2%]"
                }`}
                style={{ width: "48%" }}
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

            const modelEl = (
              <div
                className={`absolute top-0 h-full pointer-events-none ${
                  isModelLeft ? "left-[-5%]" : "right-[-5%]"
                }`}
                style={{ width: "55%" }}
              >
                {/* 模型光晕 */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full ${scene.glow} blur-[130px] ${
                    isModelLeft ? "left-[20%]" : "right-[20%]"
                  }`}
                />
                <GlbDecoration
                  model={scene.model}
                  targetSize={scene.targetSize}
                  rotateSpeed={0.003}
                  floatAmount={0.14}
                  mouseFollow={0.3}
                />
                {/* 辅助模型 — 偏下方 */}
                {scene.secondary && (
                  <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[45%] h-[35%]">
                    <GlbDecoration
                      model={scene.secondary.model}
                      targetSize={scene.secondary.targetSize}
                      rotateSpeed={0.005}
                      floatAmount={0.08}
                      mouseFollow={0.25}
                    />
                  </div>
                )}
              </div>
            );

            const sceneRow = (
              <div
                key={`scene-${i}`}
                className="h-[50vh] relative flex items-center"
              >
                {isModelLeft ? (
                  <>
                    {modelEl}
                    {cardEl}
                  </>
                ) : (
                  <>
                    {cardEl}
                    {modelEl}
                  </>
                )}
              </div>
            );

            if (i === POINTS.length - 1) return [sceneRow];

            return [
              sceneRow,
              <div key={`gap-${i}`} className="h-[12vh] pointer-events-none" />,
            ];
          })}
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
