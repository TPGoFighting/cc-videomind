"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, NotebookPen, Trash2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-context";
import type { JsonResponse, UserNote } from "@/lib/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notes");
        const payload = (await res.json()) as JsonResponse<UserNote[]>;
        if (!cancelled && payload.ok) {
          setItems(payload.data ?? []);
        }
      } catch {
        // 静默失败
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authLoading]);

  const handleDelete = async (id: string) => {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: id }),
      });
      const payload = await res.json();
      if (payload.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
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
              <div key={i} className="h-24 rounded-xl bg-white/6 animate-breathe" />
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
        <h1 className="text-[24px] font-bold">笔记本</h1>
        <p className="mt-1 text-[14px] text-white/40">
          你在视频学习过程中记录的笔记
        </p>

        {loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-white/6 animate-breathe" />
            ))}
          </div>
        ) : !user ? (
          <div className="mt-8 rounded-xl border border-white/8 bg-white/4 p-8 text-center">
            <NotebookPen className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[15px] text-white/50">
              登录后可查看笔记本
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
            <NotebookPen className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[15px] text-white/50">
              还没有笔记
            </p>
            <p className="mt-1 text-[13px] text-white/30">
              在视频播放页的「笔记」标签中保存你的想法
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
                {/* 来源视频 */}
                {item.video_title && (
                  <div className="mb-2">
                    <Link
                      href={`/video/${item.video_id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0099ff]/70 transition-colors hover:text-[#0099ff]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {item.video_title}
                    </Link>
                  </div>
                )}

                {/* 笔记正文 */}
                <p className="text-[14px] leading-relaxed text-white/80 whitespace-pre-wrap">
                  {item.body}
                </p>

                {/* 底部信息 */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-white/25">
                    {formatDate(item.created_at)}
                  </span>

                  <div className="flex items-center gap-1 touch-reveal">
                    <Link
                      href={`/video/${item.video_id}`}
                      className="rounded-md p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center text-white/20 transition-colors hover:bg-white/8 hover:text-white/60"
                      title="查看视频"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
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
