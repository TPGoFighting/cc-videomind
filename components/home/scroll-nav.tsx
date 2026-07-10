"use client";

import { useRef, useEffect, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

const SECTIONS = [
  { id: "hero", label: "首页" },
  { id: "why", label: "为什么" },
  { id: "features", label: "功能" },
  { id: "stats", label: "数据" },
  { id: "roadmap", label: "路线图" },
];

export function ScrollNav() {
  const navRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);

  // 延迟显示，避免首页加载时闪现
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useGSAP(() => {
    const triggers: ScrollTrigger[] = [];

    SECTIONS.forEach((section, i) => {
      const el = document.querySelector(`[data-section="${section.id}"]`);
      if (!el) return;

      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 50%",
        end: "bottom 50%",
        onEnter: () => setActive(i),
        onEnterBack: () => setActive(i),
      });
      triggers.push(st);
    });

    return () => {
      triggers.forEach((st) => st.kill());
    };
  }, { scope: navRef });

  function scrollTo(index: number) {
    const el = document.querySelector(`[data-section="${SECTIONS[index].id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div
      ref={navRef}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center gap-3 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {SECTIONS.map((section, i) => (
        <button
          key={section.id}
          type="button"
          onClick={() => scrollTo(i)}
          aria-label={`滚动到${section.label}`}
          className="group flex items-center gap-3"
        >
          <span
            className="text-[11px] font-medium text-white/0 group-hover:text-white/40 transition-all duration-200 whitespace-nowrap"
          >
            {section.label}
          </span>
          <span
            className={`block rounded-full transition-all duration-300 ${
              i === active
                ? "w-2.5 h-2.5 bg-[#0099ff] shadow-[0_0_8px_rgba(0,153,255,0.5)]"
                : "w-2 h-2 bg-white/15 group-hover:bg-white/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
