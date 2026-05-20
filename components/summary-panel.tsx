"use client";

import { BookOpenCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DisplayMode, SummaryTakeaway } from "@/lib/types";
import { parseTimestampToSeconds } from "@/lib/utils/moments-validator";
import { DisplayModeToggle } from "./display-mode-toggle";

export function SummaryPanel({
  takeaways,
  loading,
  displayMode = "en",
  onDisplayModeChange,
  onSeekTo,
}: {
  takeaways: SummaryTakeaway[];
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
            <BookOpenCheck className="h-4 w-4 text-[#0099ff]" aria-hidden />
            核心摘要
          </CardTitle>
          {onDisplayModeChange && (
            <DisplayModeToggle value={displayMode} onChange={onDisplayModeChange} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-full rounded-full bg-white/8 animate-breathe" />
            <div className="h-3 w-11/12 rounded-full bg-white/8 animate-breathe" />
            <div className="h-3 w-4/5 rounded-full bg-white/8 animate-breathe" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-white/5 animate-breathe" />
              ))}
            </div>
          </div>
        ) : takeaways.length === 0 ? (
          <p className="text-[14px] text-[#a6a6a6]">AI 未能从此视频提取到摘要要点，请检查字幕质量。</p>
        ) : (
          <div className="space-y-4">
            {takeaways.map((t) => (
              <article
                key={t.label}
                className="rounded-lg border border-white/8 bg-white/4 px-4 py-3 transition-shadow duration-300 hover:border-white/15 hover:shadow-[rgba(0,153,255,0.08)_0px_0px_0px_1px]"
              >
                <h4 className="text-[14px] font-semibold leading-snug">
                  {showEn && <span>{t.label}</span>}
                  {showZh && t.label_zh && (
                    <span className={showEn ? "ml-2 text-white/60" : ""}>
                      {t.label_zh}
                    </span>
                  )}
                  {showZh && !t.label_zh && !showEn && (
                    <span>{t.label}</span>
                  )}
                </h4>

                {showEn && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#a6a6a6]">
                    {t.insight}
                  </p>
                )}
                {showZh && t.insight_zh && (
                  <p className="mt-1 text-[13px] leading-relaxed text-white/50">
                    {t.insight_zh}
                  </p>
                )}
                {showZh && !t.insight_zh && !showEn && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#a6a6a6]">
                    {t.insight}
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
                        className="inline-flex items-center rounded-md bg-[#0099ff]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0099ff] transition-colors hover:bg-[#0099ff]/20 hover:text-[#33adff]"
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
