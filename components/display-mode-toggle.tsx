"use client";

import { cn } from "@/lib/utils/cn";
import type { DisplayMode } from "@/lib/types";

const MODES: { value: DisplayMode; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "bilingual", label: "中英" },
  { value: "zh", label: "中文" },
];

export function DisplayModeToggle({
  value,
  onChange,
}: {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg bg-white/6 p-0.5">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors min-h-[36px]",
            value === m.value
              ? "bg-[#0099ff]/20 text-[#0099ff]"
              : "text-white/40 hover:text-white/70"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
