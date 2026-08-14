"use client";

import { useEffect, useRef } from "react";

/**
 * 顶部滚动进度条
 *
 * 随页面滚动实时从 0% 走到 100%（scroll-linked realtime）。
 * 用 rAF 节流读取滚动位置，progress = scrollTop / (scrollHeight - innerHeight)。
 * 进度条使用蓝→红点缀渐变，呼应「红/黄/蓝」点缀色，但克制不花哨。
 */

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let ticking = false;

    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${p})`;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    let ro: ResizeObserver | undefined;
    if (!reduced && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onScroll);
      ro.observe(document.body);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-white/5"
    >
      <div
        ref={barRef}
        className="h-full origin-left will-change-transform"
        style={{
          transform: "scaleX(0)",
          background:
            "linear-gradient(90deg, #0099FF 0%, #FFCC00 55%, #FF3B30 100%)",
        }}
      />
    </div>
  );
}
