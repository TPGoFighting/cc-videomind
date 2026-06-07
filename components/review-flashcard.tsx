"use client";

import { useState, useRef, useCallback, type MouseEvent } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Zap, BookOpen, RotateCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ReviewWord } from "@/lib/types";

const QUALITY_BUTTONS = [
  { quality: 0, label: "忘了", icon: RotateCcw, className: "hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30" },
  { quality: 2, label: "模糊", icon: BookOpen, className: "hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30" },
  { quality: 3, label: "记得", icon: RotateCw, className: "hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30" },
  { quality: 5, label: "简单", icon: Zap, className: "hover:bg-[#0099ff]/10 hover:text-[#0099ff] hover:border-[#0099ff]/30" },
] as const;

export function ReviewFlashcard({
  word,
  onRate,
  disabled,
}: {
  word: ReviewWord;
  onRate: (quality: number) => void;
  disabled: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const flipping = useRef(false);

  // 3D 翻转动画
  const flip = useCallback(() => {
    if (flipping.current || animating) return;
    flipping.current = true;

    const inner = innerRef.current;
    if (!inner) return;

    const target = flipped ? 0 : 180;

    gsap.to(inner, {
      rotationY: target,
      duration: 0.55,
      ease: "power2.inOut",
      onComplete: () => {
        setFlipped((v) => !v);
        flipping.current = false;
      },
    });
  }, [flipped, animating]);

  // 评分按钮入场（翻转后触发）
  useGSAP(() => {
    if (!flipped) return;

    const btns = gsap.utils.toArray<HTMLElement>(buttonsRef.current?.querySelectorAll(".rate-btn") ?? []);
    gsap.fromTo(
      btns,
      { opacity: 0, y: 20, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        stagger: 0.06,
        ease: "back.out(1.3)",
      }
    );
  }, { scope: buttonsRef, dependencies: [flipped], revertOnUpdate: true });

  // 按钮按压效果
  function onPress(e: MouseEvent<HTMLButtonElement>) {
    gsap.to(e.currentTarget, { scale: 0.92, duration: 0.1, ease: "power2.in" });
  }
  function onRelease(e: MouseEvent<HTMLButtonElement>) {
    gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: "back.out(1.7)" });
  }

  async function rate(q: number) {
    if (disabled || animating) return;
    setAnimating(true);

    const btns = gsap.utils.toArray<HTMLElement>(buttonsRef.current?.querySelectorAll(".rate-btn") ?? []);
    await gsap.to(btns, {
      opacity: 0, y: -12, scale: 0.92, duration: 0.2,
      stagger: 0.03, ease: "power2.in",
    }).then();

    await onRate(q);
    setFlipped(false);
    setAnimating(false);

    // 重置卡片角度
    if (innerRef.current) {
      gsap.set(innerRef.current, { rotationY: 0 });
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      {/* 进度标签 */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/25">复习 {word.repetitions + 1} 次</span>
        <span className={cn(
          "text-[11px] px-2 py-0.5 rounded-full",
          word.status === "mastered" ? "bg-green-500/10 text-green-400" :
          word.repetitions > 0 ? "bg-[#0099ff]/10 text-[#0099ff]" :
          "bg-white/5 text-white/30"
        )}>
          {word.status === "mastered" ? "已掌握" : word.repetitions > 0 ? "复习中" : "新词"}
        </span>
      </div>

      {/* 3D 闪卡 */}
      <div
        onClick={flip}
        className="w-full cursor-pointer select-none"
        style={{ perspective: "1000px" }}
      >
        <div
          ref={innerRef}
          className="relative w-full aspect-[4/3]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* 正面：单词 */}
          <div
            className="absolute inset-0 rounded-2xl border border-white/8 bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center hover:border-white/15"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="text-[28px] font-bold tracking-tight">{word.lemma}</span>
            {word.phonetic && (
              <span className="mt-2 text-[14px] text-white/40">{word.phonetic}</span>
            )}
            {word.partOfSpeech && (
              <span className="mt-1 text-[12px] italic text-white/25">{word.partOfSpeech}</span>
            )}
            <span className="mt-6 text-[12px] text-white/15">点击翻转查看释义</span>
          </div>

          {/* 背面：释义 */}
          <div
            className="absolute inset-0 rounded-2xl border border-[#0099ff]/20 bg-[#0d0d0d] flex flex-col items-center justify-center p-6 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-[16px] leading-relaxed text-white/80">{word.definitionZh}</p>
            {word.definitionEn && (
              <p className="mt-2 text-[13px] leading-relaxed text-white/40">{word.definitionEn}</p>
            )}
            {word.exampleEn && (
              <div className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-left w-full">
                <p className="text-[12px] leading-relaxed text-white/60">{word.exampleEn}</p>
                {word.exampleZh && (
                  <p className="mt-1 text-[11px] text-white/30">{word.exampleZh}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 评分按钮（翻转后显示） */}
      <div ref={buttonsRef}>
        {flipped && (
          <div className="flex gap-2 w-full max-w-sm">
            {QUALITY_BUTTONS.map((b) => {
              const Icon = b.icon;
              return (
                <button
                  key={b.quality}
                  type="button"
                  disabled={disabled || animating}
                  onMouseDown={onPress}
                  onMouseUp={onRelease}
                  onMouseLeave={onRelease}
                  onClick={() => rate(b.quality)}
                  className={cn(
                    "rate-btn flex-1 flex flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/[0.02] py-3 px-2",
                    "text-white/40 text-[11px] transition-colors duration-200",
                    b.className
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {b.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
