"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Flame, Trophy, X } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { StreakCalendar } from "@/components/streak-calendar";
import { useAuth } from "@/components/auth-context";
import { cn } from "@/lib/utils/cn";
import type { CheckinStatus, JsonResponse, ReviewWord } from "@/lib/types";

// ─── 随机4选项多选题 ───

type QuizMode = "word-to-zh" | "zh-to-word";

interface QuizQuestion {
  word: ReviewWord;
  options: string[];
  correctIndex: number;
  mode: QuizMode;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(words: ReviewWord[]): QuizQuestion[] {
  const allZh = words.map((w) => w.definitionZh);
  const allWords = words.map((w) => w.lemma);

  return shuffle(
    words.map((word) => {
      const mode: QuizMode = Math.random() < 0.5 ? "word-to-zh" : "zh-to-word";

      if (mode === "word-to-zh") {
        // 选择正确释义：显示英文，选中文
        const distractors = shuffle(allZh.filter((z) => z !== word.definitionZh)).slice(0, 3);
        if (distractors.length < 3) {
          // 不够就用其他单词的中文补
          for (let i = 0; i < 4 && distractors.length < 3; i++) {
            const fake = `"${String.fromCharCode(65 + i)}选项"`;
            if (!distractors.includes(fake)) distractors.push(fake);
          }
        }
        const options = shuffle([word.definitionZh, ...distractors]);
        return {
          word,
          options,
          correctIndex: options.indexOf(word.definitionZh),
          mode,
        };
      } else {
        // 选择正确单词：显示中文释义，选英文
        const distractors = shuffle(allWords.filter((w) => w !== word.lemma)).slice(0, 3);
        if (distractors.length < 3) {
          for (let i = 0; distractors.length < 3; i++) {
            const fake = `word_${i}`;
            if (!distractors.includes(fake)) distractors.push(fake);
          }
        }
        const options = shuffle([word.lemma, ...distractors]);
        return {
          word,
          options,
          correctIndex: options.indexOf(word.lemma),
          mode,
        };
      }
    })
  );
}

// ─── 主页面 ───

export default function ReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkin, setCheckin] = useState<CheckinStatus | null>(null);

  // 答题状态
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  // 加载待复习单词 + 打卡
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function load() {
      try {
        const [wRes, cRes] = await Promise.all([
          fetch("/api/review"),
          fetch("/api/checkin"),
        ]);
        const wp = (await wRes.json()) as JsonResponse<{ words: ReviewWord[] }>;
        const cp = (await cRes.json()) as JsonResponse<CheckinStatus>;
        if (!cancelled) {
          if (wp.ok) setQuestions(buildQuestions(wp.data.words));
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

  // 选答案
  const handleSelect = useCallback(
    async (idx: number) => {
      if (answered || submitting || currentQ >= questions.length) return;
      setSelectedIdx(idx);
      setAnswered(true);

      const isCorrect = idx === questions[currentQ].correctIndex;
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }

      // 提交当前单词的评分
      const quality = isCorrect ? 4 : 0;
      setSubmitting(true);
      try {
        await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviews: [{ lemma: questions[currentQ].word.lemma, quality }],
          }),
        });
        const cr = await fetch("/api/checkin");
        const cp = (await cr.json()) as JsonResponse<CheckinStatus>;
        if (cp.ok) setCheckin(cp.data);
      } catch {
        // 静默
      }

      // 延迟后下一题
      setTimeout(() => {
        const next = currentQ + 1;
        if (next >= questions.length) {
          setFinished(true);
        } else {
          setCurrentQ(next);
        }
        setSelectedIdx(null);
        setAnswered(false);
        setSubmitting(false);
      }, isCorrect ? 800 : 1200);
    },
    [answered, currentQ, questions, submitting]
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

  const total = questions.length;
  const progress = total > 0 ? ((currentQ + (finished ? 1 : 0)) / total) * 100 : 0;

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
          <div className="mt-8 space-y-4 max-w-md mx-auto">
            <div className="animate-breathe h-3 w-full rounded-full bg-white/5" />
            <div className="animate-breathe h-40 rounded-2xl bg-white/5" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-breathe h-14 rounded-xl bg-white/5" />
              ))}
            </div>
          </div>
        ) : !checkin ? null : (
          <div className="mt-6 max-w-md mx-auto">
            {/* 打卡小结 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-400" />
                <span className="text-[14px] font-medium text-white/70">
                  {checkin.streak} 天连续
                </span>
              </div>
              <span className="text-[13px] text-white/40">
                今日 {checkin.todayCount} 词
              </span>
            </div>

            {/* 完成页面 */}
            {finished ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center">
                <Trophy className="mx-auto h-12 w-12 text-amber-400" />
                <p className="mt-4 text-[20px] font-bold">
                  {correctCount === total ? "🎉 完美！" : correctCount > total * 0.7 ? "👏 不错！" : "💪 继续加油！"}
                </p>
                <div className="mt-4 flex items-center justify-center gap-6">
                  <div className="text-center">
                    <span className="text-[28px] font-bold text-[#0099ff]">{correctCount}</span>
                    <span className="text-[12px] text-white/40 ml-1">/ {total}</span>
                    <p className="text-[11px] text-white/30 mt-0.5">正确率</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[28px] font-bold text-amber-400">{streak}</span>
                    <p className="text-[11px] text-white/30 mt-0.5">最高连击</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[28px] font-bold text-white">{checkin.todayCount}</span>
                    <p className="text-[11px] text-white/30 mt-0.5">今日总量</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <Link
                    href="/review"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0099ff]/15 px-5 py-2.5 text-[14px] font-medium text-[#0099ff] transition-colors hover:bg-[#0099ff]/25"
                  >
                    再来一组
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/vocabulary"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-5 py-2.5 text-[14px] text-white/50 transition-colors hover:border-white/20 hover:text-white/70"
                  >
                    单词本
                  </Link>
                </div>

                {/* 日历 */}
                <div className="mt-6">
                  <StreakCalendar data={checkin.calendar} streak={checkin.streak} />
                </div>
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center">
                <Trophy className="mx-auto h-10 w-10 text-white/15" />
                <p className="mt-4 text-[16px] font-medium text-white/60">还没有待复习的单词</p>
                <p className="mt-1 text-[13px] text-white/30">去视频中点击高亮单词收藏，开始词汇学习</p>
                <Link href="/" className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#0099ff]/15 px-5 py-2.5 text-[14px] font-medium text-[#0099ff] transition-colors hover:bg-[#0099ff]/25">
                  开始学习 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <>
                {/* 答题区域 */}
                <div className="mb-4">
                  {/* 进度条 */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[12px] font-mono text-white/30">
                      {currentQ + 1}/{total}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0099ff] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {streak > 2 && (
                      <span className="text-[12px] font-medium text-amber-400">
                        🔥 {streak}
                      </span>
                    )}
                  </div>
                </div>

                {/* 题目卡片 */}
                <div className="rounded-2xl border border-white/8 bg-[#0a0a0a] p-6 mb-5">
                  {/* 问题 */}
                  <div className="text-center mb-6">
                    <p className="text-[11px] text-white/25 mb-2">
                      {questions[currentQ].mode === "word-to-zh" ? "选择正确释义" : "选择正确单词"}
                    </p>
                    <p className="text-[24px] font-bold break-words">
                      {questions[currentQ].mode === "word-to-zh"
                        ? questions[currentQ].word.lemma
                        : questions[currentQ].word.definitionZh}
                    </p>
                    {questions[currentQ].mode === "word-to-zh" && questions[currentQ].word.phonetic && (
                      <p className="mt-1 text-[13px] text-white/35">
                        {questions[currentQ].word.phonetic}
                      </p>
                    )}
                  </div>

                  {/* 选项 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {questions[currentQ].options.map((opt, idx) => {
                      const isCorrect = idx === questions[currentQ].correctIndex;
                      const isSelected = idx === selectedIdx;
                      let btnClass = "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]";

                      if (answered) {
                        if (isCorrect) {
                          btnClass = "border-green-500/40 bg-green-500/10 text-green-400";
                        } else if (isSelected && !isCorrect) {
                          btnClass = "border-red-500/40 bg-red-500/10 text-red-400";
                        } else {
                          btnClass = "border-white/5 bg-white/[0.01] text-white/20";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={answered}
                          onClick={() => handleSelect(idx)}
                          className={cn(
                            "btn-press rounded-xl border px-4 py-4 text-[15px] font-medium text-left transition-all duration-200",
                            "flex items-center gap-3 min-h-[52px]",
                            "active:scale-[0.97]",
                            btnClass,
                            answered && "!cursor-default"
                          )}
                        >
                          <span className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                            answered && isCorrect
                              ? "bg-green-500/20 text-green-400"
                              : answered && isSelected && !isCorrect
                                ? "bg-red-500/20 text-red-400"
                                : "bg-white/8 text-white/30"
                          )}>
                            {answered && isCorrect ? <Check className="h-3.5 w-3.5" /> :
                             answered && isSelected && !isCorrect ? <X className="h-3.5 w-3.5" /> :
                             String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 答后提示 */}
                  {answered && (
                    <div className={cn(
                      "mt-4 rounded-xl px-4 py-3 text-center text-[13px]",
                      selectedIdx === questions[currentQ].correctIndex
                        ? "bg-green-500/5 text-green-400"
                        : "bg-red-500/5 text-red-400"
                    )}>
                      {selectedIdx === questions[currentQ].correctIndex ? (
                        <span>✅ 正确！{questions[currentQ].word.lemma} — {questions[currentQ].word.definitionZh}</span>
                      ) : (
                        <span>
                          ❌ 正确答案：{questions[currentQ].word.lemma} — {questions[currentQ].word.definitionZh}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
