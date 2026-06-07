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
      "flex h-12 w-full rounded-xl border border-white/15 bg-white/85 px-4 text-[15px] text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition-all duration-200",
      "hover:border-white/25 hover:bg-white/95",
      "focus-visible:border-[#0099ff] focus-visible:ring-2 focus-visible:ring-[rgba(0,153,255,0.15)] focus-visible:bg-white",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
