"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronDown } from "lucide-react";
import { VideoUrlInput } from "@/components/video-url-input";
import { GlbDecoration } from "@/components/glb-decoration";
import { GLB_MODELS } from "@/lib/glb-models";
import { EASE } from "@/lib/gsap/constants";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";

/** 将文本拆分为独立的字符 span */
function splitText(text: string, className: string) {
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
  const glowRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Hero 入场 Timeline
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: EASE.out } });

    tl.fromTo(".hero-badge", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 })
      .fromTo(
        ".hero-char",
        { opacity: 0, y: 60, rotateX: -40 },
        { opacity: 1, y: 0, rotateX: 0, duration: 0.6, stagger: { each: 0.022, from: "start" }, ease: "back.out(1.4)" },
        "-=0.25"
      )
      .fromTo(".hero-subtitle", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.2")
      .fromTo(".hero-input", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.2")
      .fromTo(".hero-scroll", { opacity: 0, y: -8 }, { opacity: 0.4, y: 0, duration: 0.6 }, "-=0.1");

    // 滚动提示弹跳
    gsap.to(".hero-scroll-arrow", {
      y: 8,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });
  }, { scope });

  // 鼠标跟随聚光灯
  useGSAP(() => {
    const glow = glowRef.current;
    if (!glow) return;
    const onMove = (e: MouseEvent) => {
      gsap.to(glow, { x: e.clientX - 300, y: e.clientY - 300, duration: 2, ease: EASE.soft });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, { scope });

  // 滚动驱动实时视差 / 内容重组
  useGSAP(() => {
    const trigger = {
      trigger: scope.current,
      start: "top top",
      end: "bottom top",
      scrub: true,
    };

    // 左文内容随滚动上移 + 轻微淡出（重组感）
    gsap.to(".hero-content", {
      yPercent: -14,
      opacity: 0.55,
      ease: "none",
      scrollTrigger: trigger,
    });

    // 右侧预览卡以不同速率下沉，制造纵深视差
    gsap.to(".hero-visual", {
      yPercent: 22,
      scale: 0.96,
      ease: "none",
      scrollTrigger: trigger,
    });

    // 聚光灯随滚动反向缓动
    gsap.to(glowRef.current, {
      yPercent: 35,
      ease: "none",
      scrollTrigger: trigger,
    });
  }, { scope });

  // 预览卡片 3D 倾斜
  useGSAP(() => {
    const card = previewRef.current;
    if (!card || isMobile) return;

    const onMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateY: x * 12,
        rotateX: -y * 12,
        duration: 0.6,
        ease: "power2.out",
      });
    };
    const onLeave = () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
    };
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    return () => {
      card.removeEventListener("mousemove", onMove);
      card.removeEventListener("mouseleave", onLeave);
    };
  }, { scope, dependencies: [isMobile] });

  return (
    <section ref={scope} className="relative mx-auto w-full max-w-full px-4 pt-28 pb-8 sm:max-w-[90%] sm:px-5 sm:pt-36 sm:pb-12 md:max-w-[85%] lg:max-w-[80%]">
      {/* 鼠标跟随聚光灯 */}
      <div
        ref={glowRef}
        className="pointer-events-none fixed top-0 left-0 w-[600px] h-[600px] rounded-full bg-[#0099ff]/[0.06] blur-[120px] z-0"
        style={{ willChange: "transform" }}
      />

      {/* 背景 3D 线框环面 + 3D Parrot 模型 */}
      <div className="absolute right-[-5%] top-[12%] w-[500px] h-[400px] opacity-[0.06] pointer-events-none hidden lg:block">
        <svg viewBox="0 0 200 160" className="w-full h-full">
          <ellipse cx="100" cy="80" rx="90" ry="55" fill="none" stroke="#0099ff" strokeWidth="0.4" strokeDasharray="8 4" />
          <ellipse cx="100" cy="80" rx="70" ry="42" fill="none" stroke="#a855f7" strokeWidth="0.3" strokeDasharray="4 6" />
          <ellipse cx="100" cy="80" rx="50" ry="28" fill="none" stroke="#0099ff" strokeWidth="0.5" strokeDasharray="12 5" />
        </svg>
      </div>
      {/* 光晕背景 */}
      <div className="absolute right-[4%] top-[10%] w-[450px] h-[450px] rounded-full bg-[#0099ff]/[0.04] blur-[120px] pointer-events-none hidden lg:block" />
      {/* 3D Parrot 模型 — 右侧中层装饰 */}
      <div className="absolute right-[2%] top-[8%] w-[400px] h-[400px] hidden lg:block z-[1] pointer-events-none">
        <GlbDecoration
          model={GLB_MODELS.parrot}
          targetSize={3.0}
          rotateSpeed={0.004}
          floatAmount={0.15}
          mouseFollow={0.3}
        />
      </div>
      <div className="absolute left-[-3%] bottom-[20%] w-[300px] h-[300px] opacity-[0.04] pointer-events-none hidden lg:block">
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <circle cx="60" cy="60" r="55" fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="10 5" />
          <circle cx="60" cy="60" r="40" fill="none" stroke="#0099ff" strokeWidth="0.4" />
          <circle cx="60" cy="60" r="25" fill="none" stroke="#a855f7" strokeWidth="0.3" strokeDasharray="4 4" />
        </svg>
      </div>

      <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 items-center">
        {/* 左侧文字区 */}
        <div className="hero-content flex flex-col justify-center space-y-8">
          {/* Badge */}
          <div className="hero-badge">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0099ff]/20 bg-[#0099ff]/6 px-4 py-1.5 text-[13px] font-medium text-[#0099ff] backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0099ff]/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0099ff]" />
              </span>
              YouTube AI 学习工作区
            </div>
          </div>

          {/* 超大渐变标题 */}
          <div className="space-y-2">
            <h1 className="max-w-2xl text-[36px] font-extrabold leading-[1.08] sm:text-[52px] md:text-[64px] lg:text-[76px] tracking-[-0.02em]">
              <span className="block text-white">
                {splitText("把任何公开的", "hero-char")}
              </span>
              <span className="block text-white">
                {splitText("YouTube 课程", "hero-char")}
              </span>
              <span className="block text-gradient">
                {splitText("变成你的学习笔记", "hero-char")}
              </span>
            </h1>
          </div>

          {/* 副标题 */}
          <p className="hero-subtitle max-w-lg text-[16px] sm:text-[17px] leading-relaxed text-[#a6a6a6]">
            粘贴视频链接，即刻获取元数据、转录文本、摘要、带时间戳的要点和对话问答——所有分析都基于视频真实内容。
          </p>

          {/* 输入框 */}
          <div className="hero-input">
            <VideoUrlInput />
            <p className="mt-3 text-[13px] text-white/25">
              支持 youtube.com / youtu.be / shorts / embed 等格式
            </p>
          </div>

        </div>

        {/* 右侧预览卡片 — 3D 倾斜 */}
        <div ref={previewRef} className="hero-visual hidden lg:block" style={{ perspective: "1000px" }}>
          <PreviewCard />
        </div>
      </div>

      {/* 底部滚动提示 */}
      <div className="hero-scroll absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 opacity-40">
        <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/40">Scroll</span>
        <ChevronDown className="hero-scroll-arrow h-4 w-4 text-white/30" />
      </div>
    </section>
  );
}

function PreviewCard() {
  return (
    <div className="relative w-full rounded-2xl border border-white/8 bg-[#0a0a0a]/90 backdrop-blur-sm p-5 shadow-[0_0_0_1px_rgba(0,153,255,0.05),0_20px_60px_rgba(0,0,0,0.4)]">
      {/* 视频预览区 */}
      <div className="relative aspect-video w-full rounded-xl bg-gradient-to-br from-[#0f1923] via-[#0d1b2a] to-[#1b2838] overflow-hidden shadow-[inset_0_0_40px_rgba(0,153,255,0.08)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/10 transition-transform duration-300 hover:scale-110">
            <div className="ml-1 h-0 w-0 border-l-[14px] border-t-[9px] border-b-[9px] border-l-white/80 border-t-transparent border-b-transparent" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div className="h-full w-[45%] rounded-r-full bg-gradient-to-r from-[#0099ff] to-[#a855f7]" />
        </div>
      </div>

      {/* 元数据 */}
      <div className="mt-4 space-y-2">
        <div className="h-4 w-3/4 rounded-full bg-white/8" />
        <div className="h-3 w-1/2 rounded-full bg-white/5" />
      </div>

      {/* 分析结果 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-2 rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
          <div className="h-2.5 w-2/5 rounded-full bg-[#0099ff]/20" />
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-white/5" />
            <div className="h-2 w-5/6 rounded-full bg-white/5" />
            <div className="h-2 w-4/6 rounded-full bg-white/5" />
          </div>
        </div>
        <div className="space-y-2 rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
          <div className="h-2.5 w-2/5 rounded-full bg-[#a855f7]/20" />
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-white/5" />
            <div className="h-2 w-4/5 rounded-full bg-white/5" />
            <div className="h-2 w-3/5 rounded-full bg-white/5" />
          </div>
        </div>
      </div>

      {/* 时间戳列表 */}
      <div className="mt-3 space-y-1.5">
        {[4, 3, 4, 2].map((w, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-2.5 w-8 shrink-0 rounded-full bg-[#0099ff]/15" />
            <div className="h-2 rounded-full bg-white/5" style={{ width: `${w * 12 + 15}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
