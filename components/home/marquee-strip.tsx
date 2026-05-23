"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

const WORDS_ROW1 = ["精准转录", "AI 问答", "智能缓存", "要点提取", "单词收藏", "句子笔记", "间隔复习"];
const WORDS_ROW2 = ["Provider 架构", "多模型支持", "时间戳追溯", "双语显示", "闪卡测验", "笔记导出", "团队共享"];

function MarqueeRow({ words, direction = 1 }: { words: string[]; direction?: 1 | -1 }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!trackRef.current) return;
    const distance = trackRef.current.scrollWidth / 2;
    gsap.to(trackRef.current, {
      x: direction * -distance,
      duration: 30,
      repeat: -1,
      ease: "none",
    });
  }, { scope: trackRef });

  return (
    <div className="overflow-hidden whitespace-nowrap">
      <div ref={trackRef} className="inline-flex gap-4">
        {[...words, ...words].map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="inline-block text-[48px] sm:text-[64px] lg:text-[80px] font-extrabold tracking-tight uppercase text-transparent hover:text-[#0099ff]/15 transition-colors duration-500 cursor-default"
            style={{ WebkitTextStroke: "1px rgba(255,255,255,0.08)" }}
          >
            {word}
            <span className="text-white/6 mx-2">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MarqueeStrip() {
  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      {/* 背景微光 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#0099ff]/[0.02] to-transparent" />
      <MarqueeRow words={WORDS_ROW1} direction={1} />
      <MarqueeRow words={WORDS_ROW2} direction={-1} />
    </section>
  );
}
