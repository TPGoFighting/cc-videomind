"use client";

import { useEffect, useRef } from "react";

/**
 * 磁吸光标（Magnetic Cursor）
 *
 * 一个跟随鼠标的小圆点 + 外环，使用 requestAnimationFrame + lerp 缓动。
 * 悬停可交互元素（a / button / [data-magnetic] / input / [role=button]）时，
 * 光标向元素中心插值偏移（磁吸），并放大、反色（mix-blend-mode: difference）。
 *
 * 可访问性：
 * - 触屏设备（无 hover / 精确指针）不启用，保留系统光标。
 * - prefers-reduced-motion 时不启用自定义光标。
 */

const INTERACTIVE_SELECTOR =
  "a, button, [data-magnetic], input, textarea, select, [role='button']";

// 磁吸强度：光标向元素中心靠拢的比例（0 = 不吸，1 = 完全吸到中心）
const MAGNET_PULL = 0.38;

// lerp 系数：dot 跟手、ring 滞后
const DOT_LERP = 0.35;
const RING_LERP = 0.18;

function canUseMagneticCursor(): boolean {
  if (typeof window === "undefined") return false;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  return fine && !reduced;
}

export function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canUseMagneticCursor()) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const root = document.documentElement;
    root.classList.add("cursor-none");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX;
    let dotY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;
    let hovering = false;
    let hoveredEl: Element | null = null;
    let visible = false;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    };

    const onOver = (e: MouseEvent) => {
      const target = (e.target as Element | null)?.closest(INTERACTIVE_SELECTOR);
      if (target) {
        hovering = true;
        hoveredEl = target;
        ring.classList.add("cursor-ring--hover");
      }
    };

    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget as Element | null;
      if (hoveredEl && (!related || !hoveredEl.contains(related))) {
        hovering = false;
        hoveredEl = null;
        ring.classList.remove("cursor-ring--hover");
      }
    };

    const onLeaveWindow = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const tick = () => {
      dotX += (mouseX - dotX) * DOT_LERP;
      dotY += (mouseY - dotY) * DOT_LERP;

      let targetX = mouseX;
      let targetY = mouseY;

      if (hovering && hoveredEl) {
        const rect = hoveredEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        // 向元素中心插值偏移
        targetX = mouseX + (cx - mouseX) * MAGNET_PULL;
        targetY = mouseY + (cy - mouseY) * MAGNET_PULL;
      }

      ringX += (targetX - ringX) * RING_LERP;
      ringY += (targetY - ringY) * RING_LERP;

      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    document.addEventListener("mouseleave", onLeaveWindow);

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("mouseleave", onLeaveWindow);
      root.classList.remove("cursor-none");
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-ring pointer-events-none fixed left-0 top-0 z-[9999] h-9 w-9 rounded-full border border-white opacity-0 mix-blend-difference will-change-transform"
      />
      <div
        ref={dotRef}
        aria-hidden
        className="cursor-dot pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-white opacity-0 mix-blend-difference will-change-transform"
      />
    </>
  );
}
