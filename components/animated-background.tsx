"use client";

/**
 * 常驻几何动画背景 — 桌面端和移动端共享
 * 纯 CSS 动画，零 JS 开销，GPU 加速
 */
export function AnimatedBackground({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const isMobile = variant === "mobile";

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {/* ── 噪点纹理叠加 ── */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── 网格点阵（桌面端） ── */}
      {!isMobile && <DotGrid />}

      {/* ── 浮动几何图形 ── */}
      <FloatingShapes variant={variant} />

      {/* ── 渐变光束 ── */}
      <GradientBeams variant={variant} />

      {/* ── 大光晕 ── */}
      <GlowOrbs variant={variant} />
    </div>
  );
}

/** 网格点阵 — 缓慢上移 */
function DotGrid() {
  return (
    <div
      className="absolute inset-0 animate-float-slow opacity-[0.06]"
      style={{
        backgroundImage: `radial-gradient(circle, rgb(255 255 255 / 1) 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      }}
    />
  );
}

/** 浮动几何图形 */
function FloatingShapes({ variant }: { variant: "desktop" | "mobile" }) {
  const shapes = variant === "mobile" ? MOBILE_SHAPES : DESKTOP_SHAPES;

  return (
    <div className="absolute inset-0">
      {shapes.map((shape) => (
        <div
          key={shape.id}
          className="absolute"
          style={{
            width: shape.size,
            height: shape.size,
            left: shape.x,
            top: shape.y,
            opacity: shape.opacity,
            animation: `float-shape ${shape.duration}s ease-in-out infinite`,
            animationDelay: `${shape.delay}s`,
            transform: `rotate(${shape.rotation}deg)`,
          }}
        >
          {shape.type === "circle" && (
            <div
              className="w-full h-full rounded-full border"
              style={{ borderColor: shape.color, borderWidth: shape.strokeWidth }}
            />
          )}
          {shape.type === "square" && (
            <div
              className="w-full h-full rounded-md border"
              style={{ borderColor: shape.color, borderWidth: shape.strokeWidth }}
            />
          )}
          {shape.type === "triangle" && (
            <svg viewBox="0 0 40 40" className="w-full h-full">
              <polygon
                points="20,4 36,34 4,34"
                fill="none"
                stroke={shape.color}
                strokeWidth={shape.strokeWidth ?? "1"}
                strokeLinejoin="round"
              />
            </svg>
          )}
          {shape.type === "hexagon" && (
            <svg viewBox="0 0 40 40" className="w-full h-full">
              <polygon
                points="20,2 37,11 37,29 20,38 3,29 3,11"
                fill="none"
                stroke={shape.color}
                strokeWidth={shape.strokeWidth ?? "1"}
                strokeLinejoin="round"
              />
            </svg>
          )}
          {shape.type === "cross" && (
            <svg viewBox="0 0 40 40" className="w-full h-full">
              <line x1="20" y1="4" x2="20" y2="36" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "1.5"} />
              <line x1="4" y1="20" x2="36" y2="20" stroke={shape.color} strokeWidth={shape.strokeWidth ?? "1.5"} />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

/** 渐变光束 */
function GradientBeams({ variant }: { variant: "desktop" | "mobile" }) {
  if (variant === "mobile") return null;

  return (
    <>
      {/* 顶部横扫光束 */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-30"
        style={{
          background: "linear-gradient(90deg, transparent, #0099ff, #33adff, #0099ff, transparent)",
          backgroundSize: "200% 100%",
          animation: "beam-sweep 8s ease-in-out infinite",
        }}
      />
      {/* 左侧斜向光束 */}
      <div
        className="absolute top-[10%] -left-[10%] w-[40%] h-[1px] rotate-[15deg] opacity-20"
        style={{
          background: "linear-gradient(90deg, transparent, #0099ff, transparent)",
          animation: "beam-sweep 10s ease-in-out 2s infinite",
        }}
      />
      {/* 右侧斜向光束 */}
      <div
        className="absolute top-[60%] -right-[5%] w-[35%] h-[1px] -rotate-[20deg] opacity-15"
        style={{
          background: "linear-gradient(90deg, transparent, #33adff, transparent)",
          animation: "beam-sweep 12s ease-in-out 5s infinite",
        }}
      />
    </>
  );
}

/** 大光晕球 */
function GlowOrbs({ variant }: { variant: "desktop" | "mobile" }) {
  if (variant === "mobile") {
    return (
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full bg-[#0099ff]/[0.03] blur-[100px] animate-float-slow" />
    );
  }

  return (
    <>
      {/* 主光晕 — 中心上方 */}
      <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full bg-[#0099ff]/[0.04] blur-[120px] animate-float-slow" />
      {/* 副光晕 — 左侧 */}
      <div className="absolute top-[20%] left-[5%] w-[500px] h-[500px] rounded-full bg-[#0099ff]/[0.03] blur-[100px] animate-float-slow" style={{ animationDelay: "-4s" }} />
      {/* 副光晕 — 右侧 */}
      <div className="absolute top-[50%] right-[5%] w-[400px] h-[400px] rounded-full bg-[#0066cc]/[0.03] blur-[80px] animate-float-slow-delayed" />
      {/* 小光晕 — 底部 */}
      <div className="absolute bottom-[10%] left-[30%] w-[300px] h-[300px] rounded-full bg-[#0099ff]/[0.02] blur-[60px] animate-float-slow" style={{ animationDelay: "-6s" }} />
    </>
  );
}

// ── 几何图形配置 ──

interface ShapeConfig {
  id: string;
  type: "circle" | "square" | "triangle" | "hexagon" | "cross";
  size: string;
  x: string;
  y: string;
  opacity: number;
  color: string;
  strokeWidth?: string;
  duration: number;
  delay: number;
  rotation: number;
}

const DESKTOP_SHAPES: ShapeConfig[] = [
  // 大圈 — 左上角
  { id: "c1", type: "circle", size: "180px", x: "-5%", y: "8%", opacity: 0.04, color: "#0099ff", strokeWidth: "1.5", duration: 18, delay: 0, rotation: 0 },
  // 六边形 — 右上角
  { id: "h1", type: "hexagon", size: "120px", x: "88%", y: "15%", opacity: 0.05, color: "#33adff", strokeWidth: "1", duration: 20, delay: -3, rotation: 15 },
  // 三角 — 左中
  { id: "t1", type: "triangle", size: "80px", x: "8%", y: "55%", opacity: 0.06, color: "#0099ff", strokeWidth: "1.5", duration: 16, delay: -5, rotation: 30 },
  // 方块 — 右中
  { id: "s1", type: "square", size: "60px", x: "82%", y: "60%", opacity: 0.04, color: "#66bbff", strokeWidth: "1", duration: 14, delay: -2, rotation: 45 },
  // 小圈 — 中间
  { id: "c2", type: "circle", size: "40px", x: "45%", y: "25%", opacity: 0.05, color: "#0099ff", strokeWidth: "2", duration: 12, delay: -7, rotation: 0 },
  // 十字 — 右下
  { id: "x1", type: "cross", size: "50px", x: "75%", y: "80%", opacity: 0.04, color: "#0099ff", strokeWidth: "2", duration: 15, delay: -4, rotation: 10 },
  // 六边形 — 左下
  { id: "h2", type: "hexagon", size: "70px", x: "12%", y: "78%", opacity: 0.03, color: "#33adff", strokeWidth: "1", duration: 17, delay: -8, rotation: -10 },
  // 小三角 — 顶部中间
  { id: "t2", type: "triangle", size: "36px", x: "55%", y: "10%", opacity: 0.06, color: "#0099ff", strokeWidth: "2", duration: 13, delay: -1, rotation: 60 },
  // 圈 — 右侧
  { id: "c3", type: "circle", size: "90px", x: "92%", y: "40%", opacity: 0.03, color: "#0099ff", strokeWidth: "1", duration: 22, delay: -6, rotation: 0 },
  // 方块 — 底部中心
  { id: "s2", type: "square", size: "44px", x: "40%", y: "85%", opacity: 0.04, color: "#66bbff", strokeWidth: "1", duration: 11, delay: -9, rotation: 20 },
];

const MOBILE_SHAPES: ShapeConfig[] = [
  { id: "c1", type: "circle", size: "100px", x: "-10%", y: "10%", opacity: 0.04, color: "#0099ff", strokeWidth: "1.5", duration: 18, delay: 0, rotation: 0 },
  { id: "t1", type: "triangle", size: "50px", x: "85%", y: "20%", opacity: 0.06, color: "#0099ff", strokeWidth: "1.5", duration: 15, delay: -3, rotation: 25 },
  { id: "h1", type: "hexagon", size: "55px", x: "5%", y: "65%", opacity: 0.04, color: "#33adff", strokeWidth: "1", duration: 17, delay: -5, rotation: -8 },
  { id: "s1", type: "square", size: "36px", x: "78%", y: "75%", opacity: 0.05, color: "#66bbff", strokeWidth: "1", duration: 13, delay: -2, rotation: 38 },
];
