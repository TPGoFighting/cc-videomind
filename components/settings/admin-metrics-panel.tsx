"use client";

import { useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductMetrics } from "@/lib/product/analytics-store";

function percentage(value: number | null) {
  return value === null ? "暂无数据" : `${Math.round(value * 100)}%`;
}

function duration(value: number | null) {
  return value === null ? "暂无数据" : value >= 1000 ? `${(value / 1000).toFixed(1)} 秒` : `${Math.round(value)} 毫秒`;
}

const FIXTURE_METRICS: ProductMetrics = {
  windowDays: 30,
  eventCount: 0,
  parse: { started: 0, completed: 0, failed: 0, successRate: null, p50Ms: null, p95Ms: null },
  analysis: { completed: 0, failed: 0, cacheHitRate: null, costMicrousd: 0, averageCostMicrousd: null },
  learning: { firstSaves: 0, savingUsers: 0, reviewOpened: 0, reviewCompleted: 0, d1ReturnRate: null, d7ReturnRate: null },
};

export function AdminMetricsPanel({ fixture = false }: { fixture?: boolean }) {
  const [metrics, setMetrics] = useState<ProductMetrics | null>(fixture ? FIXTURE_METRICS : null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fixture) return;
    fetch("/api/admin/metrics?days=30", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "统计加载失败");
        setMetrics(payload.data.metrics);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "统计加载失败"));
  }, [fixture]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Activity className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
          30 天产品健康度
        </CardTitle>
        <p className="text-[13px] leading-5 text-white/45">仅汇总用户明确同意后的白名单事件，不读取字幕、笔记或收藏正文。</p>
        {fixture ? <p className="text-xs text-amber-200/70">开发验收零数据状态，不代表真实用户指标。</p> : null}
      </CardHeader>
      <CardContent>
        {!metrics && !error ? (
          <div className="flex min-h-24 items-center justify-center text-sm text-white/45"><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />读取聚合指标…</div>
        ) : error ? (
          <p role="alert" className="rounded-lg bg-red-400/10 px-3 py-3 text-sm text-red-300">{error}</p>
        ) : metrics ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["解析成功率", percentage(metrics.parse.successRate), `P50 ${duration(metrics.parse.p50Ms)} · P95 ${duration(metrics.parse.p95Ms)}`],
              ["首次保存", String(metrics.learning.firstSaves), `${metrics.learning.savingUsers} 位保存用户`],
              ["D1 / D7 回访", `${percentage(metrics.learning.d1ReturnRate)} / ${percentage(metrics.learning.d7ReturnRate)}`, `${metrics.learning.reviewCompleted} 次完成复习`],
              ["分析缓存 / 单次成本", percentage(metrics.analysis.cacheHitRate), metrics.analysis.averageCostMicrousd === null ? "暂无成本样本" : `平均 ${(metrics.analysis.averageCostMicrousd / 1_000_000).toFixed(4)} 美元估算`],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <p className="text-xs text-white/40">{label}</p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white">{value}</p>
                <p className="mt-1 text-xs leading-5 text-white/35">{detail}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
