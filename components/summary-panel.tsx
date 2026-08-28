"use client";

import { BookOpenCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SummaryTakeaway } from "@/lib/types";
import { parseTimestampToSeconds } from "@/lib/utils/moments-validator";

export function SummaryPanel({
  takeaways,
  loading,
  onSeekTo,
}: {
  takeaways: SummaryTakeaway[];
  loading: boolean;
  onSeekTo?: (seconds: number) => void;
}) {

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <BookOpenCheck className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
            核心摘要
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-full rounded-full skeleton-wave" />
            <div className="h-3 w-11/12 rounded-full skeleton-wave" />
            <div className="h-3 w-4/5 rounded-full skeleton-wave" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg skeleton-wave" />
              ))}
            </div>
          </div>
        ) : takeaways.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--tp-text-muted)]">AI 解析暂时没有结果；字幕仍可继续阅读和收藏。</p>
        ) : (
          <div className="stagger-children space-y-4">
            {takeaways.map((t) => (
              <article
                key={t.label}
                className="rounded-lg border border-[var(--tp-border)] bg-white/[0.025] px-4 py-4 transition-colors duration-200 hover:border-[var(--tp-border-strong)]"
              >
                <h4 className="text-[14px] font-semibold leading-snug">
                  <span>{t.label}</span>
                  {t.label_zh && t.label_zh !== t.label && (
                    <span className="ml-2 text-white/60">
                      {t.label_zh}
                    </span>
                  )}
                </h4>

                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--tp-text-secondary)]">
                  {t.insight}
                </p>
                {t.insight_zh && t.insight_zh !== t.insight && (
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">
                    {t.insight_zh}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.timestamps.map((ts) => {
                    const seconds = parseTimestampToSeconds(ts);
                    return (
                      <button
                        key={ts}
                        type="button"
                        onClick={() => onSeekTo?.(seconds)}
                        className="inline-flex min-h-10 items-center rounded-md bg-[rgba(91,168,255,0.1)] px-3 font-mono text-xs font-semibold text-[var(--tp-accent)] transition-colors hover:bg-[rgba(91,168,255,0.18)] hover:text-[var(--tp-accent-hover)]"
                      >
                        {ts}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
