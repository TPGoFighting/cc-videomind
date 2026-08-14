"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-[var(--radius)] border border-[var(--tp-border)] bg-[var(--tp-surface)] px-4 text-base text-[var(--tp-text)] placeholder:text-[var(--tp-text-faint)] shadow-sm outline-none transition-[border-color,background-color,box-shadow] duration-200",
      "hover:border-[var(--tp-border-strong)] hover:bg-[var(--tp-surface-raised)]",
      "focus-visible:border-[var(--tp-accent)] focus-visible:bg-[var(--tp-surface-raised)] focus-visible:ring-2 focus-visible:ring-[rgba(91,168,255,0.18)]",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
