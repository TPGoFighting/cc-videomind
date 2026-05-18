import { BookOpenCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VideoAnalysis } from "@/lib/types";

export function SummaryPanel({
  analysis,
  loading,
}: {
  analysis: VideoAnalysis | null;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BookOpenCheck className="h-4 w-4 text-[#0099ff]" aria-hidden />
          摘要
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-full rounded-full bg-white/8 animate-breathe" />
            <div className="h-3 w-11/12 rounded-full bg-white/8 animate-breathe" />
            <div className="h-3 w-4/5 rounded-full bg-white/8 animate-breathe" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-white/5 animate-breathe" />
              ))}
            </div>
          </div>
        ) : analysis ? (
          <>
            <p className="text-[15px] leading-relaxed text-[#a6a6a6]">
              {analysis.summary}
            </p>
            <div className="space-y-2">
              <h4 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">
                关键要点
              </h4>
              {analysis.takeaways.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-white/8 bg-white/4 px-4 py-2.5 text-[14px] leading-relaxed text-[#c0c0c0]"
                >
                  {item}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[14px] text-[#a6a6a6]">分析完成后摘要将显示在这里。</p>
        )}
      </CardContent>
    </Card>
  );
}
