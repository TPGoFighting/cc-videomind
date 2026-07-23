"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CheckCircle2, CircleDot, Circle } from "lucide-react";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

interface Milestone {
  status: "done" | "wip" | "planned";
  date: string;
  title: string;
  body: string;
}

const MILESTONES: Milestone[] = [
  {
    status: "done",
    date: "2025 Q4",
    title: "AI 转录分析引擎",
    body: "YouTube 字幕提取 + 元数据解析 + 要点时刻生成 + 对话式问答，核心分析闭环完成。",
  },
  {
    status: "done",
    date: "2026 Q1",
    title: "个人知识库",
    body: "单词本、句子本、笔记本 + 历史记录。所有数据基于 localStorage 缓存，二次进入秒开。",
  },
  {
    status: "done",
    date: "2026 Q2",
    title: "AI 并发优化 + 本地优先",
    body: "多 AI Provider 并发调用提速，字幕、分析与学习资料默认保存在本机。",
  },
  {
    status: "wip",
    date: "2026 Q3",
    title: "移动端 App",
    body: "React Native / Flutter 跨平台 App，支持离线缓存视频字幕，随时随地碎片化学习。",
  },
  {
    status: "wip",
    date: "2026 Q3",
    title: "多语言支持",
    body: "UI 国际化 i18n，优先支持英文和日文界面，后续扩展到韩文和繁体中文。",
  },
  {
    status: "planned",
    date: "2026 Q4",
    title: "笔记导出",
    body: "支持将视频笔记导出到 Notion、Obsidian、Markdown 文件，丰富知识管理生态。",
  },
  {
    status: "planned",
    date: "2027 Q1",
    title: "AI 学习路径",
    body: "基于学习历史和知识图谱，AI 自动推荐相关视频和复习计划，构建个人学习路线。",
  },
];

const STATUS_STYLES: Record<string, { Icon: typeof CheckCircle2; lineClass: string; dotClass: string }> = {
  done: { Icon: CheckCircle2, lineClass: "text-[#0099ff]/60", dotClass: "text-[#0099ff] bg-[#0a0a0a]" },
  wip: { Icon: CircleDot, lineClass: "text-amber-400/60", dotClass: "text-amber-400 bg-[#0a0a0a] animate-pulse" },
  planned: { Icon: Circle, lineClass: "text-white/10", dotClass: "text-white/25 bg-[#0a0a0a]" },
};

/** 贝塞尔曲线路径 — 从顶部中央蜿蜒到底部中央 */
const CURVE_PATH = "M200,0 C280,80 120,160 200,240 C280,320 120,400 200,480 C280,560 120,640 200,720 C280,800 120,880 200,960 C280,1040 120,1120 200,1200";

export function RoadmapSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isMobile = useIsMobile();

  // DrawSVG 曲线绘制
  useGSAP(() => {
    if (isMobile) return;
    const line = svgRef.current?.querySelector(".roadmap-curve");
    if (!line) return;

    gsap.fromTo(
      line,
      { drawSVG: "0% 0%" },
      {
        drawSVG: "0% 100%",
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 55%",
          end: "bottom 55%",
          scrub: 0.5,
        },
      }
    );
  }, { scope: sectionRef, dependencies: [isMobile], revertOnUpdate: true });

  // 节点交错入场
  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>(".roadmap-item");
    items.forEach((item, i) => {
      const isLeft = i % 2 === 0;
      gsap.fromTo(
        item,
        { opacity: 0, x: isLeft ? -50 : 50, scale: 0.9 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: item,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        }
      );
    });
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
        <span className="inline-block rounded-full border border-white/8 bg-white/[0.02] px-4 py-1.5 text-[12px] font-medium text-[#0099ff] tracking-wider uppercase">
          路线图
        </span>
        <h2 className="text-[28px] sm:text-[40px] font-bold tracking-tight">
          持续进化的
          <span className="text-gradient"> 学习工具</span>
        </h2>
        <p className="text-[15px] text-[#a6a6a6] max-w-lg mx-auto">
          透明公开的开发节奏——已经完成了什么，正在做什么，未来会做什么。
        </p>
      </div>

      {/* 状态图例 */}
      <div className="flex items-center justify-center gap-6 mb-16">
        {(["done", "wip", "planned"] as const).map((status) => {
          const { Icon } = STATUS_STYLES[status];
          const label = { done: "已完成", wip: "进行中", planned: "规划中" }[status];
          return (
            <div key={status} className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${STATUS_STYLES[status].dotClass}`} />
              <span className="text-[12px] text-white/35">{label}</span>
            </div>
          );
        })}
      </div>

      {/* 桌面端：曲线时间线 */}
      <div className="hidden md:block relative">
          {/* SVG 曲线 — 位于中央 */}
          <svg
            ref={svgRef}
            className="absolute left-1/2 top-0 -translate-x-1/2 w-[400px] h-full pointer-events-none"
            viewBox="0 0 400 1200"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* 装饰性背景虚线 */}
            <path
              d={CURVE_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="4 12"
              className="text-white/6"
              vectorEffect="non-scaling-stroke"
            />
            {/* 主绘制曲线 */}
            <path
              className="roadmap-curve"
              d={CURVE_PATH}
              fill="none"
              stroke="url(#curve-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {/* 渐变定义 */}
            <defs>
              <linearGradient id="curve-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0099ff" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#0099ff" stopOpacity="0.6" />
                <stop offset="70%" stopColor="#a855f7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
              </linearGradient>
            </defs>
          </svg>

          <div className="relative">
            {MILESTONES.map((item, i) => {
              const isLeft = i % 2 === 0;
              const { Icon } = STATUS_STYLES[item.status];

              return (
                <div
                  key={item.title}
                  className="roadmap-item flex items-center mb-20 last:mb-0"
                  style={{
                    minHeight: "140px",
                  }}
                >
                  {/* 左侧内容 */}
                  {isLeft ? (
                    <>
                      <div className="w-[calc(50%-80px)] text-right pr-10">
                        <span className="inline-block text-[11px] font-mono font-semibold text-white/25 tracking-wider mb-2">
                          {item.date}
                        </span>
                        <h3 className="text-[17px] font-bold tracking-tight mb-2">{item.title}</h3>
                        <p className="text-[14px] leading-relaxed text-[#a6a6a6]">{item.body}</p>
                      </div>
                      <div className="w-[160px] flex justify-center">
                        <div className="relative flex items-center justify-center">
                          <Icon className={`h-6 w-6 ${STATUS_STYLES[item.status].dotClass} rounded-full z-10`} />
                        </div>
                      </div>
                      <div className="w-[calc(50%-80px)]" />
                    </>
                  ) : (
                    <>
                      <div className="w-[calc(50%-80px)]" />
                      <div className="w-[160px] flex justify-center">
                        <div className="relative flex items-center justify-center">
                          <Icon className={`h-6 w-6 ${STATUS_STYLES[item.status].dotClass} rounded-full z-10`} />
                        </div>
                      </div>
                      <div className="w-[calc(50%-80px)] text-left pl-10">
                        <span className="inline-block text-[11px] font-mono font-semibold text-white/25 tracking-wider mb-2">
                          {item.date}
                        </span>
                        <h3 className="text-[17px] font-bold tracking-tight mb-2">{item.title}</h3>
                        <p className="text-[14px] leading-relaxed text-[#a6a6a6]">{item.body}</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
      </div>

      {/* 移动端：单列时间线 */}
      <div className="md:hidden relative pl-8">
          <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[#0099ff]/40 via-[#0099ff]/20 to-transparent rounded-full" />

          <div className="space-y-10">
            {MILESTONES.map((item) => {
              const { Icon } = STATUS_STYLES[item.status];
              return (
                <div key={item.title} className="roadmap-item relative">
                  <div className="absolute -left-[25px] top-1 flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${STATUS_STYLES[item.status].dotClass} rounded-full`} />
                  </div>
                  <span className="block text-[11px] font-mono font-semibold text-white/25 tracking-wider mb-1">
                    {item.date}
                  </span>
                  <h3 className="text-[15px] font-bold tracking-tight mb-1.5">{item.title}</h3>
                  <p className="text-[13px] leading-relaxed text-[#a6a6a6]">{item.body}</p>
                </div>
              );
            })}
          </div>
      </div>
    </section>
  );
}
