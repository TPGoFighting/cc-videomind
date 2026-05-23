import { gsap } from "gsap";

/** 包装 GSAP 动画逻辑，自动尊重 prefers-reduced-motion */
export function safeAnimate(
  scope: Parameters<gsap.Context["add"]>[0],
  animation: (ctx: gsap.Context) => void | (() => void)
): void {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", (ctx) => {
    const cleanup = animation(ctx);
    return () => {
      cleanup?.();
      ctx.revert();
    };
  });
  scope?.(() => () => mm.revert());
}
