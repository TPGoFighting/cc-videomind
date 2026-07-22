"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  BookmarkPlus,
  CalendarClock,
  Check,
  Clock3,
  ExternalLink,
  Flame,
  Loader2,
  Play,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { StreakCalendar } from "@/components/streak-calendar";
import { useAuth } from "@/components/auth-context";
import type {
  ReviewQueueItem,
  TodayReviewSummary,
} from "@/lib/product/retention";
import type { CheckinStatus, JsonResponse } from "@/lib/types";

type WeeklySummary = {
  status: "ready" | "collecting";
  activeDays: number;
  completedReviews: number;
  savedItems: number;
  dueCount: number;
  message: string;
};

type ReviewPayload = {
  items: ReviewQueueItem[];
  summary: TodayReviewSummary;
  weekly: WeeklySummary;
};

type ReviewResult = {
  kind: "word" | "quote";
  id: string;
  nextReviewAt: string;
  explanation: string;
};

function formatReviewTime(value: string | null) {
  if (!value) return "保存新内容后，这里会出现下一次复习时间";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "下次复习时间待更新";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ReviewOnboarding({ signedOut }: { signedOut: boolean }) {
  const steps = [
    { icon: Play, title: "先看一条知识视频", detail: "从字幕里找到真正想留下的词或句子。" },
    { icon: BookmarkPlus, title: "保存时保留出处", detail: "Teach Player 会记住原视频与准确时间点。" },
    { icon: CalendarClock, title: "约 24 小时后再见", detail: "先回忆，再揭示答案，随时跳回原语境。" },
  ] as const;

  return (
    <section className="mt-8 rounded-[1.25rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 sm:p-8">
      <p className="text-sm font-semibold text-[var(--tp-accent)]">复习队列从一次保存开始</p>
      <h2 className="mt-3 max-w-[18ch] text-3xl font-semibold tracking-[-0.04em]">今天留下一条，明天就有明确任务</h2>
      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="rounded-xl border border-[var(--tp-border)] bg-[var(--tp-bg-secondary)] p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-[var(--tp-accent)]" aria-hidden />
                <span className="font-mono text-xs text-[var(--tp-text-faint)]">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--tp-text-muted)]">{step.detail}</p>
            </article>
          );
        })}
      </div>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        {signedOut ? (
          <Link href="/login?next=%2Freview" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--tp-accent)] px-5 text-sm font-semibold text-[#08101a] hover:bg-[var(--tp-accent-hover)]">
            登录并保留复习进度
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
        <Link href="/explore" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[var(--tp-border-strong)] px-5 text-sm font-semibold text-[var(--tp-text)] hover:bg-white/5">
          选择一条学习视频
        </Link>
      </div>
    </section>
  );
}

function QueueOverview({ summary }: { summary: TodayReviewSummary }) {
  return (
    <section aria-label="今日复习概览" className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tp-text-faint)]">今日待复习</p>
        <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{summary.dueCount}</p>
        <p className="mt-1 text-sm text-[var(--tp-text-muted)]">{summary.wordCount} 个词，{summary.quoteCount} 个句子</p>
      </div>
      <div className="rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tp-text-faint)]">复习节奏</p>
        <p className="mt-3 text-lg font-semibold">{summary.cadence === "light" ? "轻量" : summary.cadence === "focused" ? "强化" : "稳步"}</p>
        <p className="mt-1 text-sm text-[var(--tp-text-muted)]">每日最多 {summary.dailyLimit} 条</p>
      </div>
      <div className="rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tp-text-faint)]">下一次出现</p>
        <p className="mt-3 text-sm font-semibold leading-6">{formatReviewTime(summary.nextReviewAt)}</p>
        <Link href="/settings#review-preferences" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--tp-accent)]">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          调整节奏
        </Link>
      </div>
    </section>
  );
}

function WeeklyReviewCard({ weekly }: { weekly: WeeklySummary }) {
  return (
    <section className="rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tp-text-faint)]">本周回顾</p>
          <h2 className="mt-2 text-lg font-semibold">{weekly.status === "ready" ? "你的学习节奏" : "正在积累真实数据"}</h2>
        </div>
        <BookOpenCheck className="h-5 w-5 text-[var(--tp-accent)]" aria-hidden />
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--tp-text-muted)]">{weekly.message}</p>
      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--tp-border)] pt-4 text-center">
        <div><dt className="text-xs text-[var(--tp-text-faint)]">活跃天数</dt><dd className="mt-1 font-semibold">{weekly.activeDays}</dd></div>
        <div><dt className="text-xs text-[var(--tp-text-faint)]">完成复习</dt><dd className="mt-1 font-semibold">{weekly.completedReviews}</dd></div>
        <div><dt className="text-xs text-[var(--tp-text-faint)]">新增内容</dt><dd className="mt-1 font-semibold">{weekly.savedItems}</dd></div>
      </dl>
    </section>
  );
}

export default function ReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [checkin, setCheckin] = useState<CheckinStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [lastResult, setLastResult] = useState<ReviewResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [reviewResponse, checkinResponse] = await Promise.all([
          fetch("/api/review"),
          fetch("/api/checkin"),
        ]);
        const reviewJson = (await reviewResponse.json()) as JsonResponse<ReviewPayload>;
        const checkinJson = (await checkinResponse.json()) as JsonResponse<CheckinStatus>;
        if (cancelled) return;
        if (!reviewJson.ok) {
          setLoadError(reviewJson.error.message || "暂时无法加载复习内容。");
        } else {
          setPayload(reviewJson.data);
          setCurrentIndex(0);
          setCompleted(0);
          setRevealed(false);
          setLastResult(null);
        }
        if (checkinJson.ok) setCheckin(checkinJson.data);
      } catch {
        if (!cancelled) setLoadError("暂时无法加载复习内容，请检查网络后重试。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authLoading, reloadKey, user]);

  const currentItem = payload?.items[currentIndex] ?? null;
  const finished = Boolean(payload && payload.items.length > 0 && completed >= payload.items.length);
  const progress = payload?.items.length ? Math.round((completed / payload.items.length) * 100) : 0;

  const primaryText = useMemo(() => {
    if (!currentItem) return "";
    return currentItem.kind === "word" ? currentItem.lemma : currentItem.textEn;
  }, [currentItem]);

  const submitQuality = useCallback(async (quality: number) => {
    if (!currentItem || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviews: [currentItem.kind === "word"
            ? { kind: "word", id: currentItem.id, lemma: currentItem.lemma, quality }
            : { kind: "quote", id: currentItem.id, quality }],
        }),
      });
      const json = (await response.json()) as JsonResponse<{
        results: ReviewResult[];
        checkin?: CheckinStatus;
      }>;
      if (!json.ok) {
        setActionError(json.error.message || "这条复习结果暂时没有保存，请重试。");
        return;
      }
      setLastResult(json.data.results[0] ?? null);
      if (json.data.checkin) setCheckin(json.data.checkin);
      // The queue totals are server-owned: refresh the compact summary after
      // each saved rating so the overview and weekly card never claim that an
      // item is still due after it has already been scheduled.
      void fetch("/api/review?summary=1")
        .then((summaryResponse) => summaryResponse.json() as Promise<JsonResponse<{
          summary: TodayReviewSummary;
          weekly: WeeklySummary;
        }>>)
        .then((summaryJson) => {
          if (!summaryJson.ok) return;
          setPayload((current) => current ? {
            ...current,
            summary: summaryJson.data.summary,
            weekly: summaryJson.data.weekly,
          } : current);
        })
        .catch(() => {
          // The rating has already been saved. Keep the next card usable even
          // when the non-critical summary refresh cannot complete.
        });
      setCompleted((count) => count + 1);
      setCurrentIndex((index) => index + 1);
      setRevealed(false);
    } catch {
      setActionError("网络中断，这条结果没有保存。内容仍在当前页面，请重试。");
    } finally {
      setSubmitting(false);
    }
  }, [currentItem, submitting]);

  return (
    <div className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-text)]">
      <Navbar />
      <main className="mx-auto w-[min(72rem,calc(100%-2rem))] pb-24 pt-24 sm:pt-28 md:pb-16">
        <div className="flex flex-col gap-5 border-b border-[var(--tp-border)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--tp-accent)]">今日复习</p>
            <h1 className="mt-3 max-w-[15ch] text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.96] tracking-[-0.055em]">让值得记住的内容，再出现一次</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--tp-text-muted)]">先回忆，再揭示，再告诉系统你的真实感受；每一条都能回到原视频语境。</p>
          </div>
          {checkin ? (
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--tp-border)] px-4 py-2 text-sm text-[var(--tp-text-secondary)]">
              <Flame className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
              连续 {checkin.streak} 天
            </div>
          ) : null}
        </div>

        {!user && !authLoading ? <ReviewOnboarding signedOut /> : null}

        {authLoading || loading ? (
          <div role="status" aria-live="polite" className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
            <div className="animate-breathe h-96 rounded-2xl bg-white/5" />
            <div className="animate-breathe h-64 rounded-2xl bg-white/5" />
          </div>
        ) : null}

        {user && !loading && loadError && !payload ? (
          <div role="alert" className="mt-8 rounded-xl border border-red-400/25 bg-red-400/10 p-6">
            <p className="font-semibold text-red-100">复习内容没有加载成功</p>
            <p className="mt-2 text-sm text-red-100/80">{loadError}</p>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--tp-text)] px-4 text-sm font-semibold text-[var(--tp-bg)]">
              <RefreshCw className="h-4 w-4" aria-hidden />
              重试
            </button>
          </div>
        ) : null}

        {user && !loading && payload ? (
          <div className="mt-8 space-y-4">
            <QueueOverview summary={payload.summary} />
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
              <section className="rounded-[1.25rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 sm:p-7">
                {actionError ? <p role="alert" className="mb-5 rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{actionError}</p> : null}

                {finished ? (
                  <div className="py-8 text-center">
                    <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(91,168,255,0.14)] text-[var(--tp-accent)]"><Check className="h-6 w-6" aria-hidden /></span>
                    <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">今天的队列已完成</h2>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--tp-text-muted)]">你完成了 {completed} 条复习。系统已经按每次自评安排下一次出现。</p>
                    {lastResult ? (
                      <div className="mx-auto mt-6 max-w-lg rounded-xl border border-[var(--tp-border)] bg-[var(--tp-bg-secondary)] p-4 text-left">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tp-text-faint)]">下一步</p>
                        <p className="mt-2 text-sm font-semibold">{formatReviewTime(lastResult.nextReviewAt)}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--tp-text-muted)]">{lastResult.explanation}</p>
                      </div>
                    ) : null}
                    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                      <Link href="/explore" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--tp-accent)] px-5 text-sm font-semibold text-[#08101a]">继续学习并保存新内容</Link>
                      <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[var(--tp-border-strong)] px-5 text-sm font-semibold">
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        刷新队列
                      </button>
                    </div>
                  </div>
                ) : !currentItem ? (
                  <ReviewOnboarding signedOut={false} />
                ) : (
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[var(--tp-text-faint)]">{completed + 1}/{payload.items.length}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[var(--tp-accent)] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
                      <span className="text-xs text-[var(--tp-text-faint)]">{currentItem.kind === "word" ? "单词" : "句子"}</span>
                    </div>

                    <div className="mt-8 min-h-48 text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tp-text-faint)]">先凭记忆回答</p>
                      <p className={`${currentItem.kind === "word" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"} mx-auto mt-5 max-w-2xl break-words font-semibold leading-tight tracking-[-0.035em]`}>{primaryText}</p>
                      {currentItem.kind === "word" && currentItem.phonetic ? <p className="mt-2 text-sm text-[var(--tp-text-muted)]">{currentItem.phonetic}</p> : null}
                      <p className="mt-6 text-sm leading-6 text-[var(--tp-text-muted)]">{currentItem.dueReason}</p>
                    </div>

                    {!revealed ? (
                      <button type="button" onClick={() => setRevealed(true)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--tp-text)] px-5 text-sm font-semibold text-[var(--tp-bg)]">显示答案</button>
                    ) : (
                      <div className="mt-5 border-t border-[var(--tp-border)] pt-5">
                        <div className="rounded-xl bg-[var(--tp-bg-secondary)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tp-text-faint)]">答案</p>
                          <p className="mt-2 text-base font-semibold leading-7">{currentItem.kind === "word" ? currentItem.definitionZh : currentItem.textZh || "这条句子暂时没有中文翻译，请结合原视频语境确认。"}</p>
                          {currentItem.kind === "word" && currentItem.exampleEn ? <p className="mt-3 text-sm leading-6 text-[var(--tp-text-muted)]">{currentItem.exampleEn}</p> : null}
                          <Link href={currentItem.source.href} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--tp-accent)]">
                            <ExternalLink className="h-4 w-4" aria-hidden />
                            回原视频确认语境{currentItem.source.startTime !== null ? ` · ${Math.floor(currentItem.source.startTime)} 秒` : ""}
                          </Link>
                        </div>
                        <p className="mt-5 text-center text-sm text-[var(--tp-text-muted)]">这次回忆得怎么样？</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {[
                            { quality: 1, label: "还不熟", detail: "约 10 分钟后再见" },
                            { quality: 3, label: "有点模糊", detail: "保持当前节奏" },
                            { quality: 5, label: "记住了", detail: "适当拉长间隔" },
                          ].map((option) => (
                            <button key={option.quality} type="button" disabled={submitting} onClick={() => void submitQuality(option.quality)} className="min-h-16 rounded-xl border border-[var(--tp-border-strong)] px-3 py-3 text-left transition-colors hover:bg-white/5 disabled:cursor-wait disabled:opacity-60">
                              <span className="block text-sm font-semibold">{option.label}</span>
                              <span className="mt-1 block text-xs text-[var(--tp-text-faint)]">{option.detail}</span>
                            </button>
                          ))}
                        </div>
                        {submitting ? <p role="status" className="mt-3 flex items-center justify-center gap-2 text-sm text-[var(--tp-text-muted)]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />正在安排下一次复习</p> : null}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <aside className="space-y-4">
                <WeeklyReviewCard weekly={payload.weekly} />
                {checkin ? (
                  <section className="rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5">
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tp-text-faint)]">连续学习</p><p className="mt-2 text-lg font-semibold">{checkin.streak} 天</p></div>
                      <Clock3 className="h-5 w-5 text-[var(--tp-accent)]" aria-hidden />
                    </div>
                    <div className="mt-4"><StreakCalendar data={checkin.calendar} streak={checkin.streak} /></div>
                  </section>
                ) : null}
              </aside>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
