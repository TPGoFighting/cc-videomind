"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useCountUp } from "@/lib/hooks/useCountUp";

const STATS_DATA = [
  { label: "已解析视频", value: 12580, suffix: "+" },
  { label: "学习笔记", value: 47300, suffix: "+" },
  { label: "AI 问答", value: 89200, suffix: "+" },
  { label: "收录单词", value: 156000, suffix: "+" },
];

function AnimatedStat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const { value: current, ref } = useCountUp(value, 2500);

  return (
    <div ref={ref}>
      <div className="text-[48px] sm:text-[64px] lg:text-[80px] font-[900] tracking-[-0.03em] leading-none text-[var(--text-primary)] tabular-nums">
        {current.toLocaleString()}
        <span className="text-[var(--accent)]">{suffix}</span>
      </div>
      <div className="mt-3 text-[12px] sm:text-[13px] font-[500] tracking-[0.08em] uppercase text-[var(--text-tertiary)]">
        {label}
      </div>
    </div>
  );
}

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>(".stat-item");
    gsap.fromTo(
      items,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto w-full max-w-full px-4 py-28 sm:max-w-[90%] sm:px-5 sm:py-40 md:max-w-[85%] lg:max-w-[80%]"
    >
      <div className="absolute left-0 top-0 w-[60px] h-px bg-[var(--text-tertiary)]/30" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-16">
        {STATS_DATA.map((stat) => (
          <div key={stat.label} className="stat-item">
            <AnimatedStat {...stat} />
          </div>
        ))}
      </div>
    </section>
  );
}
