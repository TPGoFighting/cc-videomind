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
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="h-4 w-4 text-[#0099ff]" aria-hidden />
          要点时刻
        </CardTitle>
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
          <p className="text-[14px] text-[#a6a6a6]">分析完成后要点时刻将显示在这里。</p>
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
                    {m.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onSeekTo?.(startSeconds)}
                    className="shrink-0 font-mono text-xs font-semibold text-[#0099ff] transition-colors hover:text-[#33adff] hover:underline"
                  >
                    {start}–{end}
                  </button>
                </div>
                <p className="text-[13px] leading-relaxed text-[#a6a6a6]">
                  &ldquo;{m.quote}&rdquo;
                </p>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-white/60">
                  {m.reason}
                </p>
              </article>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
