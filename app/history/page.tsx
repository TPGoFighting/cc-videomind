"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-context";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";

interface HistoryItem {
  videoId: string;
  title: string | null;
  thumbnail: string | null;
  channelName: string | null;
  parsedAt: string;
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();

  const { data: items, loading } = useCachedFetch<HistoryItem>(
    "history",
    async () => {
      const res = await fetch("/api/history");
      const payload = await res.json();
      return { ok: payload.ok, data: payload.data };
    },
    { deps: [authLoading, user?.id], userId: user?.id },
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="mx-auto w-full max-w-full px-3 pt-16 pb-20 sm:max-w-[90%] sm:px-5 sm:pt-20 md:max-w-[85%] lg:max-w-[80%] md:pb-16">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/6 animate-breathe" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-full px-3 pt-16 pb-20 sm:max-w-[90%] sm:px-5 sm:pt-20 md:max-w-[85%] lg:max-w-[80%] md:pb-16">
        <h1 className="text-[24px] font-bold">历史记录</h1>
        <p className="mt-1 text-[14px] text-white/40">
          你解析过的所有视频
        </p>

        {loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/6 animate-breathe" />
            ))}
          </div>
        ) : !user ? (
          <div className="mt-8 rounded-xl border border-white/8 bg-white/4 p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[15px] text-white/50">
              登录后可查看解析历史
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/15"
            >
              立即登录
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-white/8 bg-white/4 p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[15px] text-white/50">
              还没有解析过任何视频
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/15"
            >
              开始解析
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-2">
            {items.map((item) => (
              <Link
                key={item.videoId}
                href={`/video/${item.videoId}`}
                className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/4 p-4 transition-colors hover:bg-white/8"
              >
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail ?? ""}
                    alt={item.title ?? ""}
                    width={112}
                    height={64}
                    unoptimized
                    className="h-16 w-28 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-white/6">
                    <ExternalLink className="h-5 w-5 text-white/15" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[14px] font-semibold leading-snug">
                    {item.title ?? "未命名视频"}
                  </h2>
                  <p className="mt-1 text-[12px] text-white/40">
                    {item.channelName ?? "未知频道"} ·{" "}
                    {new Date(item.parsedAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
