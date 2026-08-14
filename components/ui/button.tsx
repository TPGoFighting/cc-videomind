"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tp-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tp-bg)] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        /* 高对比主 CTA */
        default:
          "rounded-[var(--radius)] bg-[var(--tp-text)] text-[var(--tp-bg)] hover:bg-white active:scale-[0.98]",
        /* 次级操作 */
        secondary:
          "rounded-[var(--radius)] border border-[var(--tp-border)] bg-[var(--tp-surface-raised)] text-[var(--tp-text)] hover:border-[var(--tp-border-strong)] hover:bg-[#162231] active:scale-[0.98]",
        /* 幽灵按钮 — 最弱操作 */
        outline:
          "rounded-[var(--radius)] border border-[var(--tp-border-strong)] text-[var(--tp-text)] hover:bg-white/8",
        /* 纯文本 — 导航等 */
        ghost:
          "rounded-[var(--radius)] text-[var(--tp-text-secondary)] hover:bg-white/8 hover:text-[var(--tp-text)]",
        /* 唯一行动强调色 */
        accent:
          "rounded-[var(--radius)] bg-[var(--tp-accent)] text-[#08101a] hover:bg-[var(--tp-accent-hover)] active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-6 text-[15px]",
        sm: "h-8 px-4 text-[13px]",
        lg: "h-13 px-8 text-[16px]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";
