"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Clock, LogIn, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { getPlanConfig } from "@/lib/plans";
import { GameIcon } from "@/components/game-icon";
import { YouTubeStatusBanner } from "@/components/youtube-status-banner";
import { useYouTubeStatus } from "@/lib/hooks/useYouTubeStatus";
import { TodayReviewLink } from "@/components/retention/today-review-link";

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

  // 滚动时导航栏背景渐变（直接 CSS 操作，无 GSAP 动画延迟，避免闪烁）
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let ticking = false;
    const update = () => {
      const scrollY = window.scrollY;
      const p = Math.min(1, scrollY / 120);
      nav.style.backgroundColor = `rgba(8,11,15,${0.35 + p * 0.57})`;
      nav.style.backdropFilter = `blur(${4 + p * 14}px)`;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav ref={navRef} className="fixed inset-x-0 top-0 z-50 border-b border-[#a6bed6]/15">
      <div className="mx-auto flex h-14 w-full max-w-[90rem] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-white/90 transition-colors hover:text-white"
        >
          <Image src="/logo.png" alt="Teach Player" width={28} height={28} className="rounded" />
          <span>Teach Player</span>
        </Link>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
          <Link href="/#product" className="inline-flex min-h-11 items-center text-[13px] font-medium text-white/65 transition-colors hover:text-white">
            产品
          </Link>
          <Link href="/explore" className="inline-flex min-h-11 items-center text-[13px] font-medium text-white/65 transition-colors hover:text-white">
            探索
          </Link>
          <Link href="/review" className="inline-flex min-h-11 items-center text-[13px] font-medium text-white/65 transition-colors hover:text-white">
            今日复习
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {youtubeStatus !== "available" && youtubeStatus !== "checking" && (
            <YouTubeStatusBanner status={youtubeStatus} variant="inline" />
          )}
          <a
            href="https://github.com/TPGoFighting/cc-videomind/releases/download/1.8.0/app-release.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-11 items-center gap-1.5 px-3 text-[13px] font-medium text-[#8fc6ff] transition-colors hover:text-white sm:inline-flex"
          >
            <GameIcon name="download" size={14} />
            APP
          </a>
          {loading ? (
            <div ref={skeletonRef} className="h-8 w-20 rounded-md bg-white/8" />
          ) : user ? (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white"
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
                  <TodayReviewLink variant="menu" onNavigate={() => setOpen(false)} />
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
                href="/register"
                className="hidden min-h-11 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white/65 transition-colors hover:bg-white/8 hover:text-white sm:inline-flex"
              >
                注册
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] px-3 text-[13px] font-medium text-white/80 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white sm:px-4"
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
