"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KeyMoment } from "@/lib/types";
import { parseTimestampToSeconds } from "@/lib/utils/moments-validator";

export function HighlightsPanel({
  moments,
  loading,
  onSeekTo,
}: {
  moments: KeyMoment[];
  loading: boolean;
  onSeekTo?: (seconds: number) => void;
}) {

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
            要点时刻
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-wave rounded-lg border border-white/8 bg-white/3 p-3 space-y-2"
            >
              <div className="h-3 w-1/3 rounded-full bg-white/10" />
              <div className="h-2 w-full rounded-full bg-white/6" />
              <div className="h-2 w-2/3 rounded-full bg-white/6" />
            </div>
          ))}
          </div>
        ) : moments.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--tp-text-muted)]">AI 解析暂时没有结果；字幕仍可继续阅读和收藏。</p>
        ) : (
          <div className="stagger-children space-y-3">
          {moments.map((m) => {
            const [start, end] = m.timestamp.split("-");
            const startSeconds = parseTimestampToSeconds(start);

            return (
              <article
                key={`${m.timestamp}-${m.title}`}
                className="rounded-lg border border-[var(--tp-border)] bg-white/[0.025] p-4 transition-colors duration-200 hover:border-[var(--tp-border-strong)]"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="text-[14px] font-semibold leading-snug">
                    <span>{m.title}</span>
                    {m.title_zh && m.title_zh !== m.title && (
                      <span className="ml-2 text-white/60">
                        {m.title_zh}
                      </span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onSeekTo?.(startSeconds)}
                    className="inline-flex min-h-10 shrink-0 items-center font-mono text-xs font-semibold text-[var(--tp-accent)] transition-colors hover:text-[var(--tp-accent-hover)] hover:underline"
                  >
                    {start}–{end}
                  </button>
                </div>

                {/* 引用 */}
                <p className="text-[13px] leading-relaxed text-[var(--tp-text-secondary)]">
                  &ldquo;{m.quote}&rdquo;
                </p>
                {m.quote_zh && m.quote_zh !== m.quote && (
                  <p className="text-[13px] leading-relaxed text-white/50">
                    &ldquo;{m.quote_zh}&rdquo;
                  </p>
                )}

                {/* 理由 */}
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-white/60">
                  {m.reason}
                </p>
                {m.reason_zh && m.reason_zh !== m.reason && (
                  <p className="mt-1 text-[12px] leading-relaxed text-white/40">
                    {m.reason_zh}
                  </p>
                )}
              </article>
            );
          })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
