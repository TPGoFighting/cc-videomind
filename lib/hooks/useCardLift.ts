"use client";

import { useCallback, useRef } from "react";
import { gsap } from "gsap";

export function useCardLift() {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseEnter = useCallback(() => {
    gsap.to(ref.current, { y: -4, duration: 0.35, ease: "back.out(1.7)" });
  }, []);

  const onMouseLeave = useCallback(() => {
    gsap.to(ref.current, { y: 0, duration: 0.35, ease: "power2.out" });
  }, []);

  const onMouseDown = useCallback(() => {
    gsap.to(ref.current, { scale: 0.98, duration: 0.1, ease: "power2.out" });
  }, []);

  const onMouseUp = useCallback(() => {
    gsap.to(ref.current, { scale: 1, duration: 0.2, ease: "back.out(1.4)" });
  }, []);

  return { ref, handlers: { onMouseEnter, onMouseLeave, onMouseDown, onMouseUp } };
}
