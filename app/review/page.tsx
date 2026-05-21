"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Loader2, Trophy } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ReviewFlashcard } from "@/components/review-flashcard";
import { StreakCalendar } from "@/components/streak-calendar";
import { useAuth } from "@/components/auth-context";
import type { CheckinStatus, JsonResponse, ReviewWord } from "@/lib/types";

export default function ReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const [words, setWords] = useState<ReviewWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkin, setCheckin] = useState<CheckinStatus | null>(null);
  const [allDone, setAllDone] = useState(false);

  // 加载待复习单词 + 打卡状态
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      try {
        const [wordsRes, checkinRes] = await Promise.all([
          fetch("/api/review"),
          fetch("/api/checkin"),
        ]);
        const wp = (await wordsRes.json()) as JsonResponse<{ words: ReviewWord[] }>;
        const cp = (await checkinRes.json()) as JsonResponse<CheckinStatus>;
        if (!cancelled) {
          if (wp.ok) setWords(wp.data.words);
          if (cp.ok) setCheckin(cp.data);
        }
      } catch {
        // 静默
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authLoading]);

  // 提交当前单词的评分
  const handleRate = useCallback(
    async (quality: number) => {
      if (submitting || currentIndex >= words.length) return;
      setSubmitting(true);

      const current = words[currentIndex];
      try {
        await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviews: [{ lemma: current.lemma, quality }] }),
        });
        // 刷新打卡数据
        const cr = await fetch("/api/checkin");
        const cp = (await cr.json()) as JsonResponse<CheckinStatus>;
        if (cp.ok) setCheckin(cp.data);

        // 下一个
        const next = currentIndex + 1;
        if (next >= words.length) {
          setAllDone(true);
        } else {
          setCurrentIndex(next);
        }
      } catch {
        // 静默
      } finally {
        setSubmitting(false);
      }
    },
    [currentIndex, words, submitting]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="mx-auto max-w-md px-5 pt-20 pb-20">
          <div className="animate-breathe h-64 rounded-2xl bg-white/5" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-full px-3 pt-16 pb-20 sm:max-w-[90%] sm:px-5 sm:pt-20 md:max-w-[85%] lg:max-w-[80%] md:pb-16">
        <h1 className="text-[24px] font-bold">每日复习</h1>
        <p className="mt-1 text-[14px] text-white/40">
          间隔重复，对抗遗忘曲线
        </p>

        {!user ? (
          <div className="mt-8 rounded-xl border border-white/8 bg-white/4 p-8 text-center">
            <Flame className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[15px] text-white/50">登录后可开始复习</p>
            <Link href="/login" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/15">
              立即登录
            </Link>
          </div>
        ) : loading ? (
          <div className="mt-8 space-y-4">
            <div className="animate-breathe h-48 rounded-2xl bg-white/5" />
            <div className="animate-breathe h-12 w-2/3 rounded-full bg-white/5" />
          </div>
        ) : !checkin ? null : (
          <>
            {/* 打卡信息卡片 */}
            <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                    <Flame className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[22px] font-bold text-white">{checkin.streak}</span>
                    <span className="ml-1 text-[13px] text-white/40">天连续打卡</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[12px] text-white/40">今日已复习</span>
                  <br />
                  <span className="text-[15px] font-semibold text-white">
                    {checkin.todayCount} 词
                  </span>
                </div>
              </div>

              {/* 进度条 */}
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0099ff] transition-all duration-500"
                  style={{ width: `${Math.min(100, (checkin.todayCount / 10) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-white/25">
                {checkin.todayCount >= 10 ? "✅ 今日打卡完成！" : `还差 ${10 - checkin.todayCount} 个单词完成今日打卡`}
              </p>

              {/* 日历 */}
              <div className="mt-4">
                <StreakCalendar data={checkin.calendar} streak={checkin.streak} />
              </div>
            </div>

            {/* 复习区域 */}
            <div className="mt-8">
              {allDone ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
                  <Trophy className="mx-auto h-10 w-10 text-amber-400" />
                  <p className="mt-4 text-[18px] font-semibold text-white">
                    今天复习完成！🎉
                  </p>
                  <p className="mt-1 text-[14px] text-white/40">
                    所有到期单词已复习结束，明天再来
                  </p>
                  <Link
                    href="/vocabulary"
                    className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#0099ff]/15 px-5 py-2.5 text-[14px] font-medium text-[#0099ff] transition-colors hover:bg-[#0099ff]/25"
                  >
                    查看单词本
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : words.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
                  <Trophy className="mx-auto h-10 w-10 text-white/15" />
                  <p className="mt-4 text-[16px] font-medium text-white/60">
                    还没有待复习的单词
                  </p>
                  <p className="mt-1 text-[13px] text-white/30">
                    去视频中点击高亮单词收藏，开始你的词汇学习之旅
                  </p>
                  <Link
                    href="/"
                    className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#0099ff]/15 px-5 py-2.5 text-[14px] font-medium text-[#0099ff] transition-colors hover:bg-[#0099ff]/25"
                  >
                    开始学习
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <>
                  {/* 进度 */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[14px] text-white/50">
                      {currentIndex + 1} / {words.length}
                    </span>
                    <span className="text-[12px] text-white/25">
                      复习完自动保存打卡
                    </span>
                  </div>

                  {/* 闪卡 */}
                  {words[currentIndex] && (
                    <ReviewFlashcard
                      key={words[currentIndex].lemma}
                      word={words[currentIndex]}
                      onRate={handleRate}
                      disabled={submitting}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
