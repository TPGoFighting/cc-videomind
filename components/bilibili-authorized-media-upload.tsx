"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Mic } from "lucide-react";
import type { JsonResponse } from "@/lib/types";

type QueuedTask = { taskId: string; videoId: string };

export function BilibiliAuthorizedMediaUpload({ sourceVideoId }: { sourceVideoId: string }) {
  const router = useRouter();
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [queuedTask, setQueuedTask] = useState<QueuedTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!queuedTask) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/tasks/${queuedTask.taskId}`);
        const payload = await response.json() as JsonResponse<{ status: string }>;
        if (cancelled || !payload.ok) return;
        if (payload.data.status === "completed") {
          router.push(`/video/${queuedTask.videoId}`);
        } else if (payload.data.status === "failed") {
          setQueuedTask(null);
          setError("转写没有完成；文件已被安全清理。请确认媒体授权和服务状态后重试。");
        }
      } catch {
        // Keep polling; a temporary network interruption must not discard a queued task.
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [queuedTask, router]);

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setError(null);
    if (!nextFile) return;
    const media = document.createElement(nextFile.type.startsWith("video/") ? "video" : "audio");
    const objectUrl = URL.createObjectURL(nextFile);
    media.preload = "metadata";
    media.onloadedmetadata = () => {
      if (Number.isFinite(media.duration) && media.duration > 0) setDuration(String(Math.round(media.duration)));
      URL.revokeObjectURL(objectUrl);
    };
    media.onerror = () => URL.revokeObjectURL(objectUrl);
    media.src = objectUrl;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("请先选择本人或已获授权的媒体文件。");
      return;
    }
    setStatus("uploading");
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sourceVideoId", sourceVideoId);
    formData.append("duration", duration);
    if (title.trim()) formData.append("title", title.trim());

    try {
      const response = await fetch("/api/bilibili/media", { method: "POST", body: formData });
      const payload = await response.json() as JsonResponse<QueuedTask & { status: "pending" }>;
      if (!payload.ok) {
        setError(payload.error.message);
        return;
      }
      setQueuedTask({ taskId: payload.data.taskId, videoId: payload.data.videoId });
    } catch {
      setError("任务没有创建成功，请检查网络后重试。");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section aria-labelledby="bilibili-media-asr-title" className="rounded-[0.875rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tp-accent)]">没有可导入字幕？</p>
      <h2 id="bilibili-media-asr-title" className="mt-2 text-lg font-semibold text-[var(--tp-text)]">转写本人或获授权的媒体</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--tp-text-muted)]">仅上传你拥有或已获明确授权的音视频。转写完成后原文件会自动清理，学习页仍可回看对应 B 站视频。</p>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <label htmlFor={fileInputId} className="grid min-h-20 cursor-pointer place-items-center rounded-lg border border-dashed border-[var(--tp-border-strong)] bg-[var(--tp-bg)] px-4 text-center text-sm text-[var(--tp-text-muted)] transition-colors hover:border-[var(--tp-accent)]">
          <span className="inline-flex items-center gap-2"><Mic className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />{file ? file.name : "选择 MP4、WebM、MP3、M4A 或 WAV（最大 200MB）"}</span>
          <input id={fileInputId} className="sr-only" type="file" accept="video/mp4,video/webm,audio/mpeg,audio/mp4,audio/webm,audio/wav,audio/x-wav" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-[var(--tp-text-secondary)]">
            媒体时长（秒）
            <input required min="1" max="7200" type="number" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="选择文件后自动读取" className="min-h-11 rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] px-3 text-[var(--tp-text)] outline-none transition-colors focus:border-[var(--tp-accent)]" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-[var(--tp-text-secondary)]">
            学习材料标题（可选）
            <input maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`B 站视频 ${sourceVideoId}`} className="min-h-11 rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] px-3 text-[var(--tp-text)] outline-none transition-colors focus:border-[var(--tp-accent)]" />
          </label>
        </div>
        {queuedTask ? <p role="status" className="text-sm leading-6 text-[var(--tp-accent)]">转写任务已进入队列。保持此页面开启；服务器开始处理后，会自动打开学习工作台。</p> : null}
        {error ? <p role="alert" className="text-sm leading-6 text-red-300">{error}</p> : null}
        <button type="submit" disabled={status === "uploading" || Boolean(queuedTask)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--tp-text)] px-4 text-sm font-semibold text-[var(--tp-bg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60">
          {status === "uploading" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {status === "uploading" ? "正在创建任务…" : queuedTask ? "等待转写完成…" : "创建异步转写任务"}
        </button>
      </form>
    </section>
  );
}
