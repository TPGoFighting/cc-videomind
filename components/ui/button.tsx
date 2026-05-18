"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0099ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        /* 纯白胶囊 — 主 CTA */
        default:
          "bg-white text-black hover:bg-white/90 active:scale-[0.97] rounded-full",
        /* 毛玻璃胶囊 — 次级操作 */
        secondary:
          "bg-white/10 text-white hover:bg-white/18 active:scale-[0.97] rounded-full backdrop-blur-sm",
        /* 幽灵按钮 — 最弱操作 */
        outline:
          "border border-white/20 text-white hover:bg-white/8 rounded-full",
        /* 纯文本 — 导航等 */
        ghost:
          "text-white/70 hover:text-white hover:bg-white/8 rounded-full",
        /* Framer Blue 强调按钮 */
        accent:
          "bg-[#0099ff] text-white hover:bg-[#0099ff]/85 active:scale-[0.97] rounded-full",
      },
      size: {
        default: "h-11 px-6 text-[15px]",
        sm: "h-8 px-4 text-[13px]",
        lg: "h-13 px-8 text-[16px]",
        icon: "h-10 w-10",
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
