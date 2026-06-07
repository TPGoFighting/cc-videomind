"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, ExternalLink, Trash2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-context";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";
import { formatTimestamp } from "@/lib/utils/time";

interface QuoteItem {
  id: string;
  userId: string;
  videoId: string;
  textEn: string;
  textZh?: string;
  startTime: number;
  endTime: number;
  notes?: string;
  createdAt: string;
  videoTitle?: string;
}

export default function QuotesPage() {
  const { user, loading: authLoading } = useAuth();
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const { data: items, loading, mutate } = useCachedFetch<QuoteItem>(
    "quotes",
    async () => {
      const res = await fetch("/api/user-quotes");
      const payload = await res.json();
      return { ok: payload.ok, data: payload.data?.quotes ?? [] };
    },
    { deps: [authLoading, user?.id], userId: user?.id },
  );

  const handleDelete = async (id: string) => {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/user-quotes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = await res.json();
      if (payload.ok) {
        mutate((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // 静默失败
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

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
        <h1 className="text-[24px] font-bold">句子本</h1>
        <p className="mt-1 text-[14px] text-white/40">
          收藏的英语句子
        </p>

        {loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/6 animate-breathe" />
            ))}
          </div>
        ) : !user ? (
          <div className="mt-8 rounded-xl border border-white/8 bg-white/4 p-8 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[15px] text-white/50">
              登录后可查看句子本
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
            <Bookmark className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[15px] text-white/50">
              还没有收藏任何句子
            </p>
            <p className="mt-1 text-[13px] text-white/30">
              在视频转录文本中悬停并点击收藏按钮即可收藏
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/15"
            >
              开始学习
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="group rounded-xl border border-white/8 bg-white/4 p-4"
              >
                {item.videoTitle && (
                  <div className="mb-2 flex items-center gap-1.5">
                    <Link
                      href={`/video/${item.videoId}`}
                      className="text-[12px] font-medium text-[#0099ff]/70 transition-colors hover:text-[#0099ff]"
                    >
                      {item.videoTitle}
                    </Link>
                    <span className="text-[11px] text-white/20">
                      {formatTimestamp(item.startTime)}
                    </span>
                  </div>
                )}

                <p className="text-[14px] leading-relaxed text-white/80">
                  &ldquo;{item.textEn}&rdquo;
                </p>

                {item.textZh && (
                  <p className="mt-1 text-[13px] leading-relaxed text-white/40">
                    {item.textZh}
                  </p>
                )}

                {item.notes && (
                  <p className="mt-2 text-[12px] leading-relaxed text-white/30 italic">
                    {item.notes}
                  </p>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-white/25">
                    {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                  </span>

                  <div className="flex items-center gap-1 touch-reveal">
                    {!item.videoTitle && (
                      <Link
                        href={`/video/${item.videoId}`}
                        className="rounded-md p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center text-white/20 transition-colors hover:bg-white/8 hover:text-white/60"
                        title="查看视频"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={deleting.has(item.id)}
                      onClick={() => handleDelete(item.id)}
                      className="rounded-md p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center text-white/20 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
