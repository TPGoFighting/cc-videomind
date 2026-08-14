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
    <div className="inline-flex items-center rounded-lg border border-[var(--tp-border)] bg-white/[0.03] p-0.5">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "min-h-11 rounded-md px-3 text-[13px] font-medium transition-colors",
            value === m.value
              ? "bg-[rgba(91,168,255,0.15)] text-[var(--tp-accent)]"
              : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text)]"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
