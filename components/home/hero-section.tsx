"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { VideoUrlInput } from "@/components/video-url-input";

function splitChars(text: string, className: string) {
  return text.split("").map((char, i) => (
    <span
      key={i}
      className={`inline-block ${className}`}
      style={{ whiteSpace: char === " " ? "pre" : undefined }}
    >
      {char === " " ? " " : char}
    </span>
  ));
}

export function HeroSection() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.fromTo(
      ".hero-label",
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.6 }
    )
      .fromTo(
        ".hero-char",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          stagger: { each: 0.015, from: "start" },
          ease: "power4.out",
        },
        "-=0.3"
      )
      .fromTo(
        ".hero-desc",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "-=0.6"
      )
      .fromTo(
        ".hero-input-row",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
        "-=0.4"
      );
  }, { scope });

  return (
    <section
      ref={scope}
      className="relative mx-auto w-full max-w-full px-4 pt-32 pb-20 sm:max-w-[90%] sm:px-5 sm:pt-44 sm:pb-28 md:max-w-[85%] lg:max-w-[80%]"
    >
      <div className="max-w-3xl">
        {/* 标签 */}
        <div className="hero-label mb-10">
          <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--text-tertiary)]">
            Teach Player
          </span>
        </div>

        {/* 超大标题 */}
        <h1 className="mb-8 text-[clamp(40px,7vw,88px)] font-display font-[900] leading-[1.05] tracking-[-0.03em] text-[var(--text-primary)]">
          <span className="block">
            {splitChars("把任何 YouTube 视频", "hero-char")}
          </span>
          <span className="block">
            {splitChars("变成你的学习笔记", "hero-char")}
          </span>
        </h1>

        {/* 副标题 — 极简 */}
        <p className="hero-desc mb-12 max-w-md text-[15px] sm:text-[16px] leading-relaxed text-[var(--text-secondary)]">
          粘贴链接，即刻获取转录、摘要和 AI 问答。
          所有分析基于视频真实内容。
        </p>

        {/* 输入框 */}
        <div className="hero-input-row max-w-lg">
          <VideoUrlInput />
          <p className="mt-3 text-[11px] text-[var(--text-tertiary)]">
            支持 youtube.com / youtu.be / shorts / embed
          </p>
        </div>
      </div>
    </section>
  );
}
