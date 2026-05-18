"use client";

import { ListVideo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TranscriptSegment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils/time";

export function TranscriptViewer({
  transcript,
  loading,
}: {
  transcript: TranscriptSegment[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <ListVideo className="h-4 w-4 text-[#0099ff]" aria-hidden />
          转录文本
        </CardTitle>
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
          <div className="max-h-[32rem] space-y-4 overflow-auto pr-1">
            {transcript.map((segment) => (
              <div
                key={`${segment.startTime}-${segment.endTime}`}
                className="grid grid-cols-[4.5rem_1fr] gap-3 text-[14px]"
              >
                <span className="font-mono text-xs font-semibold text-[#0099ff]">
                  {formatTimestamp(segment.startTime)}
                </span>
                <p className="leading-relaxed text-[#a6a6a6]">
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
