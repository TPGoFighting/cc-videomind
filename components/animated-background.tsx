"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

export function AnimatedBackground() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const dotGrid = scope.current?.querySelector(".bg-dot-grid");
      if (dotGrid) {
        gsap.to(dotGrid, {
          y: -24,
          duration: 30,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });
      }
    });
  }, { scope });

  return (
    <div ref={scope} className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* 双层噪点纹理 */}
      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.008]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 网格点阵 — 极淡 */}
      <div
        className="bg-dot-grid absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, rgb(255 255 255 / 1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}
