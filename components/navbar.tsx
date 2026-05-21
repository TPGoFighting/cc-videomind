"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Bookmark, Clock, Download, Flame, LogIn, LogOut, Menu, NotebookPen, Settings, User } from "lucide-react";
import { useAuth } from "@/components/auth-context";

export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-full items-center justify-between px-3 sm:max-w-[90%] sm:px-5 md:max-w-[85%] lg:max-w-[80%]">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-white/80 transition-colors hover:text-white"
        >
          <Image src="/logo.png" alt="Teach Player" width={28} height={28} className="rounded" />
          Teach Player
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-20 animate-breathe rounded-full bg-white/8" />
          ) : user ? (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
              >
                <Menu className="h-4 w-4 shrink-0 md:hidden" />
                <User className="h-3.5 w-3.5 shrink-0 hidden md:block" />
                <span className="hidden sm:inline">{user.email}</span>
              </button>
              {open && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-[#1a1a1a] py-1 shadow-xl scale-in">
                  <Link
                    href="/review"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-amber-400 transition-colors hover:bg-amber-400/10 hover:text-amber-300 min-h-[44px]"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    每日复习
                  </Link>
                  <div className="mx-3 border-t border-white/6" />
                  <a
                    href="/teach-player.apk"
                    download
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-[#0099ff] transition-colors hover:bg-[#0099ff]/10 hover:text-[#0099ff] min-h-[44px]"
                  >
                    <Download className="h-3.5 w-3.5" />
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
                    <BookOpen className="h-3.5 w-3.5" />
                    单词本
                  </Link>
                  <Link
                    href="/quotes"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white min-h-[44px]"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    句子本
                  </Link>
                  <Link
                    href="/notes"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white min-h-[44px]"
                  >
                    <NotebookPen className="h-3.5 w-3.5" />
                    笔记本
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white min-h-[44px]"
                  >
                    <Settings className="h-3.5 w-3.5" />
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
