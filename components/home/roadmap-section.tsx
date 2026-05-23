"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

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
    title: "AI 并发优化 + 订阅体系",
    body: "多 AI Provider 并发调用提速，Stripe + 手动支付双通道，管理员全局/个人 AI 配置。",
  },
  {
    status: "wip",
    date: "2026 Q3",
    title: "移动端 App + 多语言支持",
    body: "React Native 跨平台 App，UI 国际化 i18n，支持英文和日文界面。",
  },
  {
    status: "planned",
    date: "2026 Q4",
    title: "笔记导出",
    body: "支持将视频笔记导出到 Notion、Obsidian、Markdown 文件。",
  },
  {
    status: "planned",
    date: "2027 Q1",
    title: "AI 学习路径",
    body: "基于学习历史和知识图谱，AI 自动推荐相关视频和复习计划。",
  },
];

const STATUS_DOT: Record<string, string> = {
  done: "bg-[var(--accent)]",
  wip: "bg-amber-400 animate-pulse",
  planned: "bg-[var(--text-tertiary)]",
};

export function RoadmapSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>(".roadmap-item");
    items.forEach((item) => {
      gsap.fromTo(
        item,
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: item,
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
      className="relative mx-auto w-full max-w-full px-4 py-28 sm:max-w-[90%] sm:px-5 sm:py-40 md:max-w-[85%] lg:max-w-[80%]"
    >
      <div className="absolute left-0 top-0 w-[60px] h-px bg-[var(--text-tertiary)]/30" />

      <div className="mb-20">
        <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--text-tertiary)]">
          路线图
        </span>
      </div>

      <div className="max-w-2xl space-y-10">
        {MILESTONES.map((item) => (
          <div key={item.title} className="roadmap-item flex items-start gap-6">
            {/* 状态点 */}
            <div className="mt-1.5 shrink-0">
              <span className={`block w-2 h-2 rounded-full ${STATUS_DOT[item.status]}`} />
            </div>
            {/* 内容 */}
            <div>
              <span className="block mb-1 text-[11px] font-[500] tracking-[0.1em] uppercase text-[var(--text-tertiary)]">
                {item.date}
              </span>
              <h4 className="text-[16px] font-[700] tracking-[-0.01em] text-[var(--text-primary)] mb-1.5">
                {item.title}
              </h4>
              <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">
                {item.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
