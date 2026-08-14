"use client";

import { useEffect, useState } from "react";
import { Chrome, LoaderCircle, Radio } from "lucide-react";
import type { JsonResponse } from "@/lib/types";

type CaptureTicket = { ticket: string; expiresAt: string };

export function BilibiliBrowserCapture({ sourceVideoId }: { sourceVideoId: string }) {
  const [consented, setConsented] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== "teach-player:capture-prepared") return;
      setLoading(false);
      if (event.data.response?.ok) setStatus("已打开 B 站视频页；点击浏览器工具栏中的 Teach Player 图标即可开始采集。再次点击结束并自动生成字幕。");
      else setError("未检测到 Teach Player Chrome 插件。请先安装插件后重试。");
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  async function prepare() {
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const response = await fetch("/api/extension/capture-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVideoId, consent: consented }),
      });
      const payload = await response.json() as JsonResponse<CaptureTicket>;
      if (!payload.ok) {
        setError(payload.error.message);
        setLoading(false);
        return;
      }
      window.postMessage({ type: "teach-player:prepare-capture", sourceVideoId, ticket: payload.data.ticket }, window.location.origin);
      window.setTimeout(() => setLoading((current) => {
        if (current) setError("未检测到 Teach Player Chrome 插件。请先安装插件后重试。");
        return false;
      }), 1200);
    } catch {
      setError("无法创建浏览器转写任务，请稍后重试。");
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="bilibili-browser-capture-title" className="rounded-[0.875rem] border border-[rgba(91,168,255,0.42)] bg-[rgba(91,168,255,0.08)] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tp-accent)]">更快的无字幕方案</p>
      <h2 id="bilibili-browser-capture-title" className="mt-2 text-lg font-semibold text-[var(--tp-text)]">用 Chrome 插件一键生成字幕</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--tp-text-muted)]">无需下载或上传文件。插件只会在你确认后采集当前 B 站标签页的音频；结束采集后自动创建学习材料。</p>
      <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm leading-6 text-[var(--tp-text-secondary)]">
        <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--tp-accent)]" />
        <span>我确认拥有或已获授权转写该视频的音频。</span>
      </label>
      <button type="button" disabled={!consented || loading} onClick={prepare} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--tp-accent)] px-4 text-sm font-semibold text-[var(--tp-bg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Chrome className="h-4 w-4" aria-hidden />}
        使用浏览器转写
      </button>
      {status ? <p role="status" className="mt-3 flex gap-2 text-sm leading-6 text-[var(--tp-text-secondary)]"><Radio className="mt-1 h-4 w-4 shrink-0 text-[var(--tp-accent)]" aria-hidden />{status}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm leading-6 text-red-300">{error}</p> : null}
    </section>
  );
}
