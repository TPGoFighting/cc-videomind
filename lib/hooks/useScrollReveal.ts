"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { STAGGER } from "@/lib/gsap/constants";

interface ScrollRevealOptions {
  y?: number;
  duration?: number;
  stagger?: number;
  start?: string;
  delay?: number;
}

export function useScrollReveal<T extends HTMLElement>(options: ScrollRevealOptions = {}) {
  const { y = 48, duration = 0.7, stagger = STAGGER.normal, start = "top 85%", delay = 0 } = options;
  const ref = useRef<T>(null);

  useGSAP(() => {
    const children = gsap.utils.toArray<HTMLElement>(ref.current?.children ?? []);
    gsap.fromTo(
      children,
      { opacity: 0, y },
      {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start,
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: ref });

  return ref;
}
