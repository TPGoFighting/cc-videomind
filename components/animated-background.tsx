"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

interface ShapeConfig {
  id: string;
  type: "circle" | "square" | "triangle" | "hexagon" | "cross" | "wire-ring" | "wire-double";
  size: string;
  x: string;
  y: string;
  opacity: number;
  color: string;
  strokeWidth?: string;
  rotation: number;
}

const DESKTOP_SHAPES: ShapeConfig[] = [
  { id: "c1", type: "circle", size: "180px", x: "-5%", y: "8%", opacity: 0.04, color: "#0099ff", strokeWidth: "1.5", rotation: 0 },
  { id: "wr1", type: "wire-ring", size: "200px", x: "75%", y: "12%", opacity: 0.06, color: "#0099ff", strokeWidth: "0.8", rotation: -15 },
  { id: "h1", type: "hexagon", size: "120px", x: "88%", y: "15%", opacity: 0.05, color: "#a855f7", strokeWidth: "1", rotation: 15 },
  { id: "t1", type: "triangle", size: "80px", x: "8%", y: "55%", opacity: 0.06, color: "#0099ff", strokeWidth: "1.5", rotation: 30 },
  { id: "wr2", type: "wire-double", size: "160px", x: "55%", y: "65%", opacity: 0.05, color: "#a855f7", strokeWidth: "0.7", rotation: 25 },
  { id: "s1", type: "square", size: "60px", x: "82%", y: "60%", opacity: 0.04, color: "#66bbff", strokeWidth: "1", rotation: 45 },
  { id: "c2", type: "circle", size: "40px", x: "45%", y: "25%", opacity: 0.05, color: "#0099ff", strokeWidth: "2", rotation: 0 },
  { id: "x1", type: "cross", size: "50px", x: "75%", y: "80%", opacity: 0.04, color: "#0099ff", strokeWidth: "2", rotation: 10 },
  { id: "h2", type: "hexagon", size: "70px", x: "12%", y: "78%", opacity: 0.03, color: "#a855f7", strokeWidth: "1", rotation: -10 },
  { id: "t2", type: "triangle", size: "36px", x: "55%", y: "10%", opacity: 0.06, color: "#0099ff", strokeWidth: "2", rotation: 60 },
  { id: "wr3", type: "wire-ring", size: "100px", x: "35%", y: "45%", opacity: 0.04, color: "#33adff", strokeWidth: "0.6", rotation: -20 },
  { id: "c3", type: "circle", size: "90px", x: "92%", y: "40%", opacity: 0.03, color: "#0099ff", strokeWidth: "1", rotation: 0 },
  { id: "s2", type: "square", size: "44px", x: "40%", y: "85%", opacity: 0.04, color: "#66bbff", strokeWidth: "1", rotation: 20 },
];

const MOBILE_SHAPES: ShapeConfig[] = [
  { id: "c1", type: "circle", size: "100px", x: "-10%", y: "10%", opacity: 0.04, color: "#0099ff", strokeWidth: "1.5", rotation: 0 },
  { id: "t1", type: "triangle", size: "50px", x: "85%", y: "20%", opacity: 0.06, color: "#0099ff", strokeWidth: "1.5", rotation: 25 },
  { id: "wr1", type: "wire-ring", size: "120px", x: "40%", y: "40%", opacity: 0.05, color: "#a855f7", strokeWidth: "0.7", rotation: -10 },
  { id: "h1", type: "hexagon", size: "55px", x: "5%", y: "65%", opacity: 0.04, color: "#a855f7", strokeWidth: "1", rotation: -8 },
  { id: "s1", type: "square", size: "36px", x: "78%", y: "75%", opacity: 0.05, color: "#66bbff", strokeWidth: "1", rotation: 38 },
];

export function AnimatedBackground({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // 网格点阵
      const dotGrid = scope.current?.querySelector(".bg-dot-grid");
      if (dotGrid) {
        gsap.to(dotGrid, { y: -48, duration: 20, ease: "none", repeat: -1, yoyo: true });
      }

      // 光晕球
      const orbs = gsap.utils.toArray<HTMLElement>(scope.current?.querySelectorAll(".bg-orb") ?? []);
      orbs.forEach((orb) => {
        gsap.to(orb, {
          x: gsap.utils.random(-50, 50),
          y: gsap.utils.random(-50, 50),
          scale: gsap.utils.random(0.9, 1.12),
          duration: gsap.utils.random(12, 20),
          delay: gsap.utils.random(-10, 0),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });

      // 几何图形 — 有机浮动 + 缓慢旋转
      const shapes = gsap.utils.toArray<HTMLElement>(scope.current?.querySelectorAll(".bg-shape") ?? []);
      shapes.forEach((shape) => {
        const rot = parseFloat(shape.dataset.rotate ?? "0");
        gsap.to(shape, {
          y: gsap.utils.random(-30, 25),
          rotate: rot + gsap.utils.random(-6, 6),
          duration: gsap.utils.random(14, 26),
          delay: gsap.utils.random(-15, 0),
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });

      // 光束
      const beams = gsap.utils.toArray<HTMLElement>(scope.current?.querySelectorAll(".bg-beam") ?? []);
      beams.forEach((beam, i) => {
        gsap.to(beam, {
          keyframes: [
            { backgroundPosition: "200% 0", opacity: 0, duration: 0 },
            { backgroundPosition: "0% 0", opacity: 0.3, duration: 5 },
            { backgroundPosition: "-200% 0", opacity: 0, duration: 5 },
          ],
          duration: 10 + i * 3,
          delay: i * 3.5,
          ease: "none",
          repeat: -1,
        });
      });
    });
  }, { scope });

  const shapes = variant === "mobile" ? MOBILE_SHAPES : DESKTOP_SHAPES;
  const showBeams = variant === "desktop";

  return (
    <div ref={scope} className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* 噪点纹理 — 双层叠加 */}
      <div
        className="absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.010]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 网格点阵 */}
      {showBeams && (
        <div
          className="bg-dot-grid absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, rgb(255 255 255 / 1) 1px, transparent 1px)`,
            backgroundSize: "52px 52px",
          }}
        />
      )}

      {/* 几何图形 */}
      <div className="absolute inset-0">
        {shapes.map((shape) => (
          <ShapeRenderer key={shape.id} shape={shape} />
        ))}
      </div>

      {/* 光束 — 多层不同角度 */}
      {showBeams && (
        <>
          <div className="bg-beam absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, #0099ff, #a855f7, #0099ff, transparent)", backgroundSize: "200% 100%" }} />
          <div className="bg-beam absolute top-[8%] -left-[5%] w-[35%] h-px rotate-12"
            style={{ background: "linear-gradient(90deg, transparent, #a855f7, transparent)", backgroundSize: "200% 100%" }} />
          <div className="bg-beam absolute top-[55%] -right-[5%] w-[40%] h-px -rotate-[18deg]"
            style={{ background: "linear-gradient(90deg, transparent, #0099ff, #33adff, transparent)", backgroundSize: "200% 100%" }} />
          <div className="bg-beam absolute top-[30%] left-[10%] w-[25%] h-px rotate-[25deg]"
            style={{ background: "linear-gradient(90deg, transparent, #66ccff, transparent)", backgroundSize: "200% 100%" }} />
        </>
      )}

      {/* 光晕球 */}
      {showBeams ? (
        <>
          <div className="bg-orb absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] rounded-full bg-[#0099ff]/[0.04] blur-[140px]" />
          <div className="bg-orb absolute top-[15%] left-[3%] w-[500px] h-[500px] rounded-full bg-[#a855f7]/[0.025] blur-[100px]" />
          <div className="bg-orb absolute top-[50%] right-[3%] w-[450px] h-[450px] rounded-full bg-[#0099ff]/[0.03] blur-[90px]" />
          <div className="bg-orb absolute bottom-[8%] left-[25%] w-[350px] h-[350px] rounded-full bg-[#a855f7]/[0.02] blur-[70px]" />
        </>
      ) : (
        <div className="bg-orb absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full bg-[#0099ff]/[0.03] blur-[100px]" />
      )}
    </div>
  );
}

function ShapeRenderer({ shape }: { shape: ShapeConfig }) {
  return (
    <div
      className="bg-shape absolute"
      data-rotate={shape.rotation}
      style={{
        width: shape.size,
        height: shape.size,
        left: shape.x,
        top: shape.y,
        opacity: shape.opacity,
      }}
    >
      {shape.type === "circle" && (
        <div className="w-full h-full rounded-full border" style={{ borderColor: shape.color, borderWidth: shape.strokeWidth }} />
      )}
      {shape.type === "square" && (
        <div className="w-full h-full rounded-md border" style={{ borderColor: shape.color, borderWidth: shape.strokeWidth }} />
      )}
      {shape.type === "triangle" && (
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <polygon points="20,4 36,34 4,34" fill="none" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "1"} strokeLinejoin="round" />
        </svg>
      )}
      {shape.type === "hexagon" && (
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <polygon points="20,2 37,11 37,29 20,38 3,29 3,11" fill="none" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "1"} strokeLinejoin="round" />
        </svg>
      )}
      {shape.type === "cross" && (
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <line x1="20" y1="4" x2="20" y2="36" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "1.5"} />
          <line x1="4" y1="20" x2="36" y2="20" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "1.5"} />
        </svg>
      )}
      {shape.type === "wire-ring" && (
        <svg viewBox="0 0 64 40" className="w-full h-full">
          <ellipse cx="32" cy="20" rx="30" ry="12" fill="none" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "0.8"} strokeDasharray="6 3" opacity="0.6" />
          <ellipse cx="32" cy="20" rx="30" ry="16" fill="none" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "0.5"} opacity="0.3" />
          <ellipse cx="32" cy="20" rx="30" ry="8" fill="none" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "0.4"} opacity="0.2" strokeDasharray="3 5" />
        </svg>
      )}
      {shape.type === "wire-double" && (
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <circle cx="32" cy="32" r="28" fill="none" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "0.7"} strokeDasharray="8 4" opacity="0.5" />
          <circle cx="32" cy="32" r="20" fill="none" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "0.5"} opacity="0.35" transform="rotate(45 32 32)" />
          <circle cx="32" cy="32" r="12" fill="none" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "0.6"} strokeDasharray="3 3" opacity="0.25" />
        </svg>
      )}
    </div>
  );
}
