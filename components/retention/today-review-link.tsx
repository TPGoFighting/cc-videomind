"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import type { TodayReviewSummary } from "@/lib/product/retention";
import type { JsonResponse } from "@/lib/types";

export function TodayReviewLink({
  variant = "card",
  onNavigate,
}: {
  variant?: "card" | "compact" | "menu";
  onNavigate?: () => void;
}) {
  const [summary, setSummary] = useState<TodayReviewSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/review?summary=1")
      .then((response) => response.json() as Promise<JsonResponse<{ summary: TodayReviewSummary }>>)
      .then((payload) => {
        if (!cancelled && payload.ok) setSummary(payload.data.summary);
      })
      .catch(() => {
        // This enhancement stays silent when the user is signed out or the summary is unavailable.
      });
    return () => { cancelled = true; };
  }, []);

  if (variant === "compact") {
    return (
      <Link href="/review" onClick={onNavigate} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--tp-border)] px-3 text-sm font-semibold text-[var(--tp-text-secondary)] hover:border-[var(--tp-border-strong)] hover:text-[var(--tp-text)]">
        <Clock3 className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
        今日复习
        {summary && summary.dueCount > 0 ? <span className="rounded-full bg-[var(--tp-accent)] px-2 py-0.5 text-xs text-[#08101a]">{summary.dueCount}</span> : null}
      </Link>
    );
  }

  if (variant === "menu") {
    return (
      <Link href="/review" onClick={onNavigate} className="flex min-h-14 items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-[rgba(91,168,255,0.1)]">
        <Clock3 className="h-4 w-4 shrink-0 text-[var(--tp-accent)]" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold text-[var(--tp-text)]">
            今日复习
            {summary && summary.dueCount > 0 ? <span className="rounded-full bg-[var(--tp-accent)] px-2 py-0.5 text-[11px] text-[#08101a]">{summary.dueCount}</span> : null}
          </span>
          <span className="mt-0.5 block text-[11px] text-[var(--tp-text-faint)]">回到原视频语境巩固记忆</span>
        </span>
      </Link>
    );
  }

  if (!summary) return null;

  return (
    <Link href="/review" onClick={onNavigate} className="group block rounded-xl border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5 transition-colors hover:border-[var(--tp-border-strong)]">
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tp-accent)]">今日待复习</span>
        <ArrowRight className="h-4 w-4 text-[var(--tp-text-faint)] transition-transform group-hover:translate-x-1" aria-hidden />
      </span>
      <span className="mt-3 block text-3xl font-semibold tracking-[-0.04em]">{summary.dueCount} 条</span>
      <span className="mt-2 block text-sm leading-6 text-[var(--tp-text-muted)]">回到原视频语境，巩固你真正保存过的内容。</span>
    </Link>
  );
}
