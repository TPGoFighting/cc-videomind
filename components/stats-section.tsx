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
  const { value: current, ref } = useCountUp(value, 2000);

  return (
    <div ref={ref} className="text-center">
      <div
        className="stat-number text-[44px] sm:text-[56px] lg:text-[64px] font-extrabold tracking-[-0.02em] leading-none tabular-nums text-gradient"
      >
        {current.toLocaleString()}
        <span className="text-gradient">{suffix}</span>
      </div>
      <div className="mt-2 text-[14px] sm:text-[15px] text-white/30 tracking-wide">
        {label}
      </div>
    </div>
  );
}

export function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const numbers = gsap.utils.toArray<HTMLElement>(".stat-number");
    gsap.fromTo(
      numbers,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto w-full max-w-full px-4 py-24 sm:max-w-[90%] sm:px-5 sm:py-32 md:max-w-[85%] lg:max-w-[80%]"
    >
      {/* 背景微光分割线 */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#0099ff]/30 to-transparent" />
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#0099ff]/20 to-transparent" />

      <div className="grid grid-cols-2 sm:grid-cols-4">
        {STATS_DATA.map((stat) => (
          <AnimatedStat key={stat.label} {...stat} />
        ))}
      </div>
    </section>
  );
}
