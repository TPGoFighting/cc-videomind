"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DisplayMode, KeyMoment } from "@/lib/types";
import { parseTimestampToSeconds } from "@/lib/utils/moments-validator";
import { DisplayModeToggle } from "./display-mode-toggle";

export function HighlightsPanel({
  moments,
  loading,
  displayMode = "en",
  onDisplayModeChange,
  onSeekTo,
}: {
  moments: KeyMoment[];
  loading: boolean;
  displayMode?: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  onSeekTo?: (seconds: number) => void;
}) {
  const showZh = displayMode === "zh" || displayMode === "bilingual";
  const showEn = displayMode === "en" || displayMode === "bilingual";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-[#0099ff]" aria-hidden />
            要点时刻
          </CardTitle>
          {onDisplayModeChange && (
            <DisplayModeToggle value={displayMode} onChange={onDisplayModeChange} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/8 bg-white/3 p-3 space-y-2"
            >
              <div className="h-3 w-1/3 rounded-full bg-white/10 animate-breathe" />
              <div className="h-2 w-full rounded-full bg-white/6 animate-breathe" />
              <div className="h-2 w-2/3 rounded-full bg-white/6 animate-breathe" />
            </div>
          ))
        ) : moments.length === 0 ? (
          <p className="text-[14px] text-[#a6a6a6]">暂未找到可跳转的要点时刻。</p>
        ) : (
          moments.map((m) => {
            const [start, end] = m.timestamp.split("-");
            const startSeconds = parseTimestampToSeconds(start);

            return (
              <article
                key={`${m.timestamp}-${m.title}`}
                className="rounded-lg border border-white/8 bg-white/4 p-3.5 transition-shadow duration-300 hover:border-white/15 hover:shadow-[rgba(0,153,255,0.08)_0px_0px_0px_1px]"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="text-[14px] font-semibold leading-snug">
                    {showEn && <span>{m.title}</span>}
                    {showZh && m.title_zh && (
                      <span className={showEn ? "ml-2 text-white/60" : ""}>
                        {m.title_zh}
                      </span>
                    )}
                    {showZh && !m.title_zh && !showEn && (
                      <span>{m.title}</span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onSeekTo?.(startSeconds)}
                    className="shrink-0 font-mono text-xs font-semibold text-[#0099ff] transition-colors hover:text-[#33adff] hover:underline"
                  >
                    {start}–{end}
                  </button>
                </div>

                {/* 引用 */}
                {showEn && (
                  <p className="text-[13px] leading-relaxed text-[#a6a6a6]">
                    &ldquo;{m.quote}&rdquo;
                  </p>
                )}
                {showZh && m.quote_zh && (
                  <p className="text-[13px] leading-relaxed text-white/50">
                    &ldquo;{m.quote_zh}&rdquo;
                  </p>
                )}
                {showZh && !m.quote_zh && !showEn && (
                  <p className="text-[13px] leading-relaxed text-[#a6a6a6]">
                    &ldquo;{m.quote}&rdquo;
                  </p>
                )}

                {/* 理由 */}
                {showEn && (
                  <p className="mt-2 text-[12px] font-medium leading-relaxed text-white/60">
                    {m.reason}
                  </p>
                )}
                {showZh && m.reason_zh && (
                  <p className="mt-1 text-[12px] leading-relaxed text-white/40">
                    {m.reason_zh}
                  </p>
                )}
                {showZh && !m.reason_zh && !showEn && (
                  <p className="mt-2 text-[12px] font-medium leading-relaxed text-white/60">
                    {m.reason}
                  </p>
                )}
              </article>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
