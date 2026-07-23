"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Trash2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/components/auth-context";
import { useCachedFetch } from "@/lib/hooks/useCachedFetch";

interface VocabItem {
  id: string;
  wordId: string;
  lemma: string;
  phonetic?: string;
  partOfSpeech?: string;
  definitionZh: string;
  definitionEn?: string;
  exampleEn?: string;
  exampleZh?: string;
  videoId: string;
  createdAt: string;
}

export default function VocabularyPage() {
  const { user, loading: authLoading } = useAuth();
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const { data: items, loading, mutate } = useCachedFetch<VocabItem>(
    "vocabulary",
    async () => {
      const res = await fetch("/api/user-vocabulary");
      const payload = await res.json();
      return { ok: payload.ok, data: payload.data?.vocabulary ?? [] };
    },
    { deps: [authLoading, user?.id], userId: user?.id },
  );

  const handleDelete = async (id: string) => {
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/user-vocabulary?id=${encodeURIComponent(id)}`, {
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
        <h1 className="text-[24px] font-bold">单词本</h1>
        <p className="mt-1 text-[14px] text-white/40">
          收藏的英语单词
        </p>

        {loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/6 animate-breathe" />
            ))}
          </div>
        ) : !user ? (
          <div className="mt-8 rounded-xl border border-white/8 bg-white/4 p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[15px] text-white/50">
              登录后可查看单词本
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
            <BookOpen className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[15px] text-white/50">
              还没有收藏任何单词
            </p>
            <p className="mt-1 text-[13px] text-white/30">
              在视频转录文本中点击高亮单词即可收藏
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/15"
            >
              开始学习
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-start gap-4 rounded-xl border border-white/8 bg-white/4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-semibold">{item.lemma}</h2>
                    {item.phonetic && (
                      <span className="text-[12px] text-white/40">{item.phonetic}</span>
                    )}
                    {item.partOfSpeech && (
                      <span className="text-[11px] italic text-white/25">{item.partOfSpeech}</span>
                    )}
                  </div>

                  <p className="mt-1 text-[13px] leading-relaxed text-white/70">
                    {item.definitionZh}
                  </p>
                  {item.definitionEn && (
                    <p className="mt-0.5 text-[12px] leading-relaxed text-white/35">
                      {item.definitionEn}
                    </p>
                  )}

                  {item.exampleEn && (
                    <div className="mt-2 rounded-lg bg-white/5 px-3 py-2">
                      <p className="text-[12px] leading-relaxed text-white/60">
                        {item.exampleEn}
                      </p>
                      {item.exampleZh && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-white/30">
                          {item.exampleZh}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="mt-2 text-[11px] text-white/25">
                    {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>

                <div className="flex items-center gap-1 touch-reveal">
                  <Link
                    href={`/video/${item.videoId}`}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-white/20 transition-colors hover:bg-white/8 hover:text-white/60"
                    title="查看视频"
                    aria-label={`查看单词“${item.lemma}”的来源视频`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    disabled={deleting.has(item.id)}
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-white/20 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="删除"
                    aria-label={`删除单词“${item.lemma}”`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
