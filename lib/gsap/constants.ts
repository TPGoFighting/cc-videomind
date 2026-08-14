export const DURATION = {
  instant: 0.15,
  fast: 0.25,
  normal: 0.45,
  entrance: 0.7,
  slow: 1.0,
  reveal: 1.2,
} as const;

export const EASE = {
  out: "power3.out",
  in: "power3.in",
  inOut: "power3.inOut",
  smooth: "power2.inOut",
  bounce: "back.out(1.7)",
  snap: "expo.out",
  soft: "sine.inOut",
} as const;

export const STAGGER = {
  tight: 0.04,
  normal: 0.08,
  loose: 0.15,
} as const;
