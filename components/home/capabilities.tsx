"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const CAPABILITIES = [
  {
    num: "01",
    title: "精准转录",
    body: "所有回答严格基于视频字幕，每条引用可追溯到具体时间点，点击即可跳转验证原始内容。",
  },
  {
    num: "02",
    title: "要点提取",
    body: "AI 自动标记视频中的关键转折点、反常识观点和核心数据，中英双语呈现。",
  },
  {
    num: "03",
    title: "对话问答",
    body: "基于视频内容自由提问，AI 引用时间戳作答。跟随式追问，像对话一样自然。",
  },
  {
    num: "04",
    title: "单词本与复习",
    body: "一键收藏视频中的单词和句子，支持间隔复习和闪卡测验，巩固学习效果。",
  },
  {
    num: "05",
    title: "智能缓存",
    body: "同一视频只解析一次，结果缓存 7 天。历史记录永久可查，重复回看不消耗配额。",
  },
  {
    num: "06",
    title: "Provider 架构",
    body: "AI 模型、字幕源、支付、存储均采用 Provider 接口设计，灵活接入不同后端，避免服务锁定。",
  },
];

export function Capabilities() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>(".cap-item");

    items.forEach((item) => {
      gsap.fromTo(
        item,
        { opacity: 0, y: 48 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power4.out",
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
      {/* 分割线 */}
      <div className="absolute left-0 top-0 w-[60px] h-px bg-[var(--text-tertiary)]/30" />

      {/* 标题 */}
      <div className="mb-20">
        <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--text-tertiary)]">
          功能
        </span>
      </div>

      {/* 功能列表 */}
      <div className="space-y-28 sm:space-y-36">
        {CAPABILITIES.map((cap, i) => (
          <div
            key={cap.num}
            className="cap-item"
            style={{ marginLeft: i % 2 === 0 ? "0%" : "20%" }}
          >
            <span className="block mb-4 text-[28px] sm:text-[36px] font-[900] tracking-[-0.02em] text-[var(--text-tertiary)]/25">
              {cap.num}
            </span>
            <h3 className="mb-4 text-[24px] sm:text-[32px] font-[900] tracking-[-0.02em] leading-[1.15] text-[var(--text-primary)]">
              {cap.title}
            </h3>
            <p className="max-w-md text-[15px] sm:text-[16px] leading-relaxed text-[var(--text-secondary)]">
              {cap.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
