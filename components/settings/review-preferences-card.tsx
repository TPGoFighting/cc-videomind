"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewCadence } from "@/lib/product/retention";
import type { JsonResponse } from "@/lib/types";

type PreferencePayload = {
  cadence: ReviewCadence;
  label: string;
  dailyLimit: number;
  firstReviewDelayHours: number;
};

const OPTIONS: Array<{
  id: ReviewCadence;
  label: string;
  limit: number;
  description: string;
}> = [
  { id: "light", label: "轻量", limit: 10, description: "每天少量巩固，后续复习间隔更宽。" },
  { id: "steady", label: "稳步", limit: 20, description: "默认节奏，在任务量与记忆强度之间平衡。" },
  { id: "focused", label: "强化", limit: 30, description: "每天处理更多内容，后续复习出现得更频繁。" },
];

export function ReviewPreferencesCard() {
  const [cadence, setCadence] = useState<ReviewCadence>("steady");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ReviewCadence | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/review-preferences")
      .then((response) => response.json() as Promise<JsonResponse<PreferencePayload>>)
      .then((payload) => {
        if (!cancelled && payload.ok) setCadence(payload.data.cadence);
      })
      .catch(() => {
        if (!cancelled) setStatus("暂时无法读取复习节奏，当前按稳步模式显示。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function updateCadence(nextCadence: ReviewCadence) {
    if (nextCadence === cadence || saving) return;
    setSaving(nextCadence);
    setStatus(null);
    try {
      const response = await fetch("/api/review-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cadence: nextCadence }),
      });
      const payload = (await response.json()) as JsonResponse<PreferencePayload>;
      if (!payload.ok) {
        setStatus(payload.error.message || "复习节奏没有保存，请重试。");
        return;
      }
      setCadence(payload.data.cadence);
      setStatus(`已切换为${payload.data.label}节奏，每天最多 ${payload.data.dailyLimit} 条。`);
    } catch {
      setStatus("网络中断，复习节奏没有保存，请重试。");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card id="review-preferences" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <SlidersHorizontal className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
          复习节奏
        </CardTitle>
        <p className="text-[13px] leading-6 text-white/45">所有模式都会在保存约 24 小时后安排首次复习；这里调整的是后续间隔和每日上限。</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p role="status" className="flex min-h-20 items-center gap-2 text-sm text-white/45"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />正在读取设置</p>
        ) : (
          <div role="radiogroup" aria-label="选择复习节奏" className="grid gap-2 sm:grid-cols-3">
            {OPTIONS.map((option) => {
              const selected = cadence === option.id;
              const isSaving = saving === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={saving !== null}
                  onClick={() => void updateCadence(option.id)}
                  className={`min-h-32 rounded-xl border p-4 text-left transition-colors disabled:cursor-wait disabled:opacity-70 ${selected ? "border-[var(--tp-accent)] bg-[rgba(91,168,255,0.1)]" : "border-[var(--tp-border)] bg-[var(--tp-bg-secondary)] hover:border-[var(--tp-border-strong)]"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{option.label}</span>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-[var(--tp-accent)]" aria-hidden /> : selected ? <Check className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden /> : null}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-[var(--tp-accent)]">每天最多 {option.limit} 条</span>
                  <span className="mt-3 block text-xs leading-5 text-white/45">{option.description}</span>
                </button>
              );
            })}
          </div>
        )}
        {status ? <p role="status" aria-live="polite" className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/65">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
