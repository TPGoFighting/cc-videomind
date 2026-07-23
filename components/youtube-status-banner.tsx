"use client";

import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { YouTubeStatus } from "@/lib/hooks/useYouTubeStatus";

export function YouTubeStatusBanner({
  status,
  variant = "banner",
}: {
  status: YouTubeStatus;
  variant?: "banner" | "inline";
}) {
  const [dismissed, setDismissed] = useState(false);

  if (status === "checking" || status === "available" || dismissed) return null;

  const message =
    status === "blocked"
      ? "YouTube 不可访问，视频无法播放"
      : "YouTube 受限，请检查是否已登录 Google 账号并开启第三方 Cookie";

  if (variant === "inline") {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-red-500/25 bg-red-600/15 px-2 text-[12px] font-medium text-red-400">
        <a
          href="https://www.youtube.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 px-1 transition-colors hover:text-red-300"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">{message}</span>
          <span className="sm:hidden">YouTube 受限 · 点击登录</span>
        </a>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          aria-label="关闭 YouTube 状态提示"
          className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-md text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-600/8 to-red-500/4 px-6 py-5">
        {/* 背景装饰 */}
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/5 blur-2xl" />
        <div className="absolute -left-4 -bottom-4 h-16 w-16 rounded-full bg-red-400/5 blur-xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn(
              "text-[14px] font-semibold",
              status === "blocked" ? "text-red-400" : "text-amber-300"
            )}>
              {status === "blocked" ? "YouTube 不可访问" : "YouTube 受限"}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">
              {status === "blocked"
                ? "当前网络环境无法访问 YouTube，请使用代理或 VPN 后刷新页面。"
                : "请确认你已在浏览器中登录 Google 账号，并启用了第三方 Cookie。"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-red-500/15 px-3 text-[12px] font-medium text-red-300 transition-colors hover:bg-red-500/25"
              >
                前往 YouTube 登录 <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-[12px] font-medium text-white/45 transition-colors hover:bg-white/10 hover:text-white/70"
              >
                忽略
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="关闭 YouTube 状态提示"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/5 hover:text-white/65"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
