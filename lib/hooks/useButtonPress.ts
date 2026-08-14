"use client";

import { useCallback, useRef } from "react";
import { gsap } from "gsap";

export function useButtonPress() {
  const ref = useRef<HTMLButtonElement>(null);

  const onMouseDown = useCallback(() => {
    gsap.to(ref.current, { scale: 0.94, duration: 0.1, ease: "power2.out" });
  }, []);

  const onMouseUp = useCallback(() => {
    gsap.to(ref.current, { scale: 1, duration: 0.25, ease: "back.out(1.7)" });
  }, []);

  const onMouseLeave = useCallback(() => {
    gsap.to(ref.current, { scale: 1, duration: 0.15, ease: "power2.out" });
  }, []);

  return { ref, handlers: { onMouseDown, onMouseUp, onMouseLeave } };
}
