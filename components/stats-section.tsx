"use client";

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
      <div className="text-[28px] font-bold tracking-tight text-white sm:text-[36px] tabular-nums">
        {current.toLocaleString()}
        <span className="text-[#0099ff]">{suffix}</span>
      </div>
      <div className="mt-1 text-[13px] text-white/40">{label}</div>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="relative mx-auto w-full max-w-full px-4 py-12 sm:max-w-[90%] sm:px-5 sm:py-16 md:max-w-[85%] lg:max-w-[80%]">
      <div className="rounded-2xl border border-white/6 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 px-6 py-10 sm:px-10">
          {STATS_DATA.map((stat) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
