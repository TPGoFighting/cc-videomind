"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Clock, LogIn, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { getPlanConfig } from "@/lib/plans";
import { GameIcon } from "@/components/game-icon";
import { YouTubeStatusBanner } from "@/components/youtube-status-banner";
import { useYouTubeStatus } from "@/lib/hooks/useYouTubeStatus";

const TIER_STYLES: Record<string, string> = {
  free: "bg-white/8 text-white/40 border-white/10",
  pro: "bg-[#0099ff]/12 text-[#0099ff] border-[#0099ff]/25",
  max: "bg-amber-400/10 text-amber-400 border-amber-400/25",
};

export function Navbar() {
  const { user, loading, signOut, subscriptionTier } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const youtubeStatus = useYouTubeStatus();
  const navRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const skeletonRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 加载骨架屏脉冲动画
  useGSAP(() => {
    if (!skeletonRef.current) return;
    gsap.to(skeletonRef.current, {
      opacity: 0.3,
      duration: 0.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, { scope: skeletonRef, dependencies: [loading] });

  // 下拉菜单入场/出场
  useGSAP(() => {
    if (!dropdownMenuRef.current) return;
    if (open) {
      gsap.fromTo(
        dropdownMenuRef.current,
        { opacity: 0, scale: 0.92, y: -8 },
        { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: "back.out(1.2)" }
      );
    }
  }, { scope: dropdownRef, dependencies: [open] });

  // 滚动时导航栏背景渐变
  useGSAP(() => {
    const nav = navRef.current;
    if (!nav) return;
    // 初始状态：接近透明
    gsap.set(nav, { backgroundColor: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" });

    ScrollTrigger.create({
      start: "top -60px",
      end: "bottom 60px",
      onUpdate: (self) => {
        const p = Math.min(1, self.progress);
        gsap.to(nav, {
          backgroundColor: `rgba(0,0,0,${0.2 + p * 0.65})`,
          backdropFilter: `blur(${4 + p * 14}px)`,
          duration: 0.15,
          overwrite: "auto",
        });
      },
    });
  }, { scope: navRef });

  return (
    <nav ref={navRef} className="fixed inset-x-0 top-0 z-50 border-b border-white/8">
      <div className="mx-auto flex h-14 w-full max-w-full items-center justify-between px-3 sm:max-w-[90%] sm:px-5 md:max-w-[85%] lg:max-w-[80%]">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-white/80 transition-colors hover:text-white"
        >
          <Image src="/logo.png" alt="Teach Player" width={28} height={28} className="rounded" />
          Teach Player
        </Link>

        <div className="flex items-center gap-3">
          {youtubeStatus !== "available" && youtubeStatus !== "checking" && (
            <YouTubeStatusBanner status={youtubeStatus} variant="inline" />
          )}
          {loading ? (
            <div ref={skeletonRef} className="h-8 w-20 rounded-full bg-white/8" />
          ) : user ? (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
              >
                <Menu className="h-4 w-4 shrink-0 md:hidden" />
                <GameIcon name="user" size={14} className="hidden md:inline-block opacity-60" />
                <span className="hidden sm:inline">{user.email}</span>
                <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none ${TIER_STYLES[subscriptionTier] ?? TIER_STYLES.free}`}>
                  {getPlanConfig(subscriptionTier).nameZh}
                </span>
              </button>
              {open && (
                <div ref={dropdownMenuRef} className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-[#1a1a1a] py-1 shadow-xl">
                  <Link
                    href="/review"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-amber-400 transition-colors hover:bg-amber-400/10 hover:text-amber-300 min-h-[44px]"
                  >
                    <GameIcon name="fire" size={14} />
                    每日复习
                  </Link>
                  <div className="mx-3 border-t border-white/6" />
                  <Link
                    href="/subscribe"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-[#0099ff] transition-colors hover:bg-[#0099ff]/10 hover:text-[#33adff] min-h-[44px]"
                  >
                    <GameIcon name="crown" size={14} />
                    订阅方案
                  </Link>
                  <a
                    href="https://github.com/TPGoFighting/cc-videomind/releases/download/v1.4.0/app-release.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-[#0099ff] transition-colors hover:bg-[#0099ff]/10 hover:text-[#0099ff] min-h-[44px]"
                  >
                    <GameIcon name="download" size={14} />
                    安卓APP下载（Beta）
                  </a>
                  <div className="mx-3 border-t border-white/6" />
                  <Link
                    href="/history"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white min-h-[44px]"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    历史记录
                  </Link>
                  <Link
                    href="/vocabulary"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white min-h-[44px]"
                  >
                    <GameIcon name="book" size={14} />
                    单词本
                  </Link>
                  <Link
                    href="/quotes"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white min-h-[44px]"
                  >
                    <GameIcon name="bookmark" size={14} />
                    句子本
                  </Link>
                  <Link
                    href="/notes"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white min-h-[44px]"
                  >
                    <GameIcon name="notebook" size={14} />
                    笔记本
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white min-h-[44px]"
                  >
                    <GameIcon name="settings" size={14} />
                    设置
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      setOpen(false);
                      router.refresh();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium text-[#0099ff] transition-colors hover:bg-[#0099ff]/10 hover:text-[#33adff]"
              >
                <GameIcon name="crown" size={14} />
                订阅
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
              >
                注册
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
              >
                <LogIn className="h-3.5 w-3.5" />
                登录
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
