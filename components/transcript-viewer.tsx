"use client";

import { useEffect, useRef, useState } from "react";
import { ListVideo, Pin, PinOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TranscriptSegment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

export function TranscriptViewer({
  transcript,
  loading,
  currentTime,
}: {
  transcript: TranscriptSegment[];
  loading: boolean;
  currentTime?: number;
}) {
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // 找到当前播放时间对应的段落索引
  const activeIndex = transcript.findIndex(
    (s) => currentTime !== undefined && currentTime >= s.startTime && currentTime < s.endTime
  );

  // 自动滚动到当前段落
  useEffect(() => {
    if (!autoScroll || !activeRef.current || !containerRef.current) return;
    // 只在元素不可见时才滚动，避免打断用户的主动滚动
    const container = containerRef.current;
    const active = activeRef.current;
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (
      activeRect.top < containerRect.top ||
      activeRect.bottom > containerRect.bottom
    ) {
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScroll, activeIndex]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <ListVideo className="h-4 w-4 text-[#0099ff]" aria-hidden />
            转录文本
          </CardTitle>
          {!loading && transcript.length > 0 && (
            <button
              type="button"
              onClick={() => setAutoScroll((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                autoScroll
                  ? "bg-[#0099ff]/15 text-[#0099ff] hover:bg-[#0099ff]/25"
                  : "bg-white/6 text-white/50 hover:bg-white/10 hover:text-white/70"
              )}
            >
              {autoScroll ? (
                <Pin className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <PinOff className="h-3.5 w-3.5" aria-hidden />
              )}
              {autoScroll ? "跟随中" : "自动跟随"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[4rem_1fr] gap-3">
                <div className="h-3 w-10 rounded-full bg-white/10 animate-breathe" />
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded-full bg-white/6 animate-breathe" />
                  <div className="h-3 w-4/5 rounded-full bg-white/6 animate-breathe" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="max-h-[50vh] space-y-3 overflow-auto pr-1 lg:max-h-[32rem]"
          >
            {transcript.map((segment, i) => (
              <div
                key={`${segment.startTime}-${segment.endTime}`}
                ref={i === activeIndex ? activeRef : undefined}
                className={cn(
                  "grid grid-cols-[4.5rem_1fr] gap-3 rounded-lg px-2 py-1.5 text-[14px] transition-colors",
                  i === activeIndex
                    ? "bg-[#0099ff]/10 ring-1 ring-[#0099ff]/20"
                    : "hover:bg-white/4"
                )}
              >
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    i === activeIndex ? "text-[#0099ff]" : "text-[#0099ff]/60"
                  )}
                >
                  {formatTimestamp(segment.startTime)}
                </span>
                <p
                  className={cn(
                    "leading-relaxed",
                    i === activeIndex ? "text-white/90" : "text-[#a6a6a6]"
                  )}
                >
                  {segment.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
