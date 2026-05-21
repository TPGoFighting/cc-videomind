"use client";

import { cn } from "@/lib/utils/cn";
import { useMemo } from "react";

export function StreakCalendar({
  data,
  streak,
}: {
  data: { date: string; count: number }[];
  streak: number;
}) {
  const today = new Date();

  // 生成近30天的日期网格（7列 x 5行）
  const grid = useMemo(() => {
    const result: (string | null)[] = [];
    const start = new Date(today);
    start.setDate(start.getDate() - 29);

    // 补齐到周日起始
    const startDay = start.getDay();
    for (let i = 0; i < startDay; i++) result.push(null);

    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      result.push(d.toISOString().slice(0, 10));
    }
    return result;
  }, [today]);

  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const item of data) m.set(item.date, item.count);
    return m;
  }, [data]);

  const todayStr = today.toISOString().slice(0, 10);

  function getIntensity(date: string): number {
    const c = countMap.get(date) ?? 0;
    if (c >= 20) return 4;
    if (c >= 15) return 3;
    if (c >= 10) return 2;
    if (c > 0) return 1;
    return 0;
  }

  const intensityColors = [
    "bg-white/6",
    "bg-green-500/20",
    "bg-green-500/35",
    "bg-green-500/55",
    "bg-green-500",
  ];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-white/30">
          近30天打卡
        </span>
        <span className="text-[11px] text-white/20">
          🔥 {streak} 天连续
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {/* 星期头 */}
        {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
          <div key={d} className="text-center text-[10px] text-white/15 h-5 flex items-center justify-center">
            {d}
          </div>
        ))}
        {grid.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="aspect-square" />;

          const level = getIntensity(date);
          const isToday = date === todayStr;

          return (
            <div
              key={date}
              title={`${date}: ${countMap.get(date) ?? 0} 个单词`}
              className={cn(
                "aspect-square rounded-[3px] transition-colors",
                intensityColors[level],
                isToday && "ring-1 ring-white/20"
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 justify-end pt-1">
        <span className="text-[10px] text-white/15">少</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <div key={lvl} className={cn("w-2.5 h-2.5 rounded-[2px]", intensityColors[lvl])} />
        ))}
        <span className="text-[10px] text-white/15">多</span>
      </div>
    </div>
  );
}
