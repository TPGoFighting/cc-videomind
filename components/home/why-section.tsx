"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function WhySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>(".why-statement");

    items.forEach((item) => {
      gsap.fromTo(
        item,
        { opacity: 0, y: 60 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power4.out",
          scrollTrigger: {
            trigger: item,
            start: "top 85%",
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

      {/* 标签 */}
      <div className="mb-20">
        <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--text-tertiary)]">
          为什么
        </span>
      </div>

      {/* 超大引用式排版 */}
      <div className="space-y-[35vh] sm:space-y-[45vh] max-w-2xl">
        <div className="why-statement">
          <span className="block mb-6 text-[80px] sm:text-[120px] font-[900] leading-none text-[var(--accent)]/15 select-none">
            &ldquo;
          </span>
          <p className="text-[20px] sm:text-[24px] font-[500] leading-[1.4] text-[var(--text-primary)]">
            每天刷几小时 YouTube 教程，但关上页面就记不住关键内容。视频是单向输出，缺少笔记、标注和回顾机制。
          </p>
          <p className="mt-6 text-[14px] text-[var(--text-tertiary)]">
            被动观看，看过就忘
          </p>
        </div>

        <div className="why-statement">
          <span className="block mb-6 text-[80px] sm:text-[120px] font-[900] leading-none text-[var(--accent)]/15 select-none">
            &ldquo;
          </span>
          <p className="text-[20px] sm:text-[24px] font-[500] leading-[1.4] text-[var(--text-primary)]">
            真正的学习需要转录文本、AI 要点提取、时间戳笔记和可检索的知识库——这些在普通视频播放器里都没有。
          </p>
          <p className="mt-6 text-[14px] text-[var(--text-tertiary)]">
            需要结构化学习工具
          </p>
        </div>

        <div className="why-statement">
          <span className="block mb-6 text-[80px] sm:text-[120px] font-[900] leading-none text-[var(--accent)]/15 select-none">
            &ldquo;
          </span>
          <p className="text-[20px] sm:text-[24px] font-[500] leading-[1.4] text-[var(--text-primary)]">
            将任何 YouTube 公开视频变成可交互的学习材料。从转录到复习，一站式覆盖完整学习闭环。
          </p>
          <p className="mt-6 text-[14px] text-[var(--text-tertiary)]">
            Teach Player 解决了这个问题
          </p>
        </div>
      </div>
    </section>
  );
}
