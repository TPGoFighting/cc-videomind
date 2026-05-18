"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-xl border border-white/15 bg-white/6 px-4 py-3 text-[15px] text-white placeholder:text-white/35 shadow-sm outline-none transition-all duration-200",
      "hover:border-white/25",
      "focus-visible:border-[#0099ff] focus-visible:ring-2 focus-visible:ring-[rgba(0,153,255,0.15)] focus-visible:bg-white/8",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
