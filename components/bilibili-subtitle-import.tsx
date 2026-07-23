"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle } from "lucide-react";
import type { JsonResponse } from "@/lib/types";

export function BilibiliSubtitleImport({ sourceVideoId }: { sourceVideoId: string }) {
  const router = useRouter();
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("请先选择字幕文件。");
      return;
    }
    setStatus("uploading");
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("sourceVideoId", sourceVideoId);
    if (title.trim()) formData.append("title", title.trim());

    try {
      const response = await fetch("/api/bilibili/subtitles", { method: "POST", body: formData });
      const payload = await response.json() as JsonResponse<{ videoId: string }>;
      if (!payload.ok) {
        if (payload.error.code === "unauthorized") {
          setError("登录后即可保存并学习你导入的字幕。");
          return;
        }
        setError(payload.error.message);
        return;
      }
      router.push(`/video/${payload.data.videoId}`);
    } catch {
      setError("上传未完成，请检查网络后重试。");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section aria-labelledby="bilibili-subtitle-import-title" className="rounded-[0.875rem] border border-[rgba(91,168,255,0.42)] bg-[rgba(91,168,255,0.08)] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tp-accent)]">Bilibili 学习材料</p>
      <h2 id="bilibili-subtitle-import-title" className="mt-2 text-lg font-semibold text-[var(--tp-text)]">导入带时间轴的字幕开始学习</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--tp-text-muted)]">支持 SRT、VTT 和 B 站 JSON 字幕。字幕会单独保存到你的学习空间；我们不会自动提取公开视频音频。</p>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <label htmlFor={fileInputId} className="grid min-h-24 cursor-pointer place-items-center rounded-lg border border-dashed border-[var(--tp-border-strong)] bg-[var(--tp-bg)] px-4 text-center text-sm text-[var(--tp-text-muted)] transition-colors hover:border-[var(--tp-accent)]">
          <span className="inline-flex items-center gap-2"><FileUp className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />{file ? file.name : "选择 .srt、.vtt 或 .json 字幕文件"}</span>
          <input id={fileInputId} className="sr-only" type="file" accept=".srt,.vtt,.json,.txt,application/json,text/vtt,text/plain" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-[var(--tp-text-secondary)]">
          学习材料标题（可选）
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder={`B 站视频 ${sourceVideoId}`} className="min-h-11 rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] px-3 text-[var(--tp-text)] outline-none transition-colors focus:border-[var(--tp-accent)]" />
        </label>
        {error ? <p role="alert" className="text-sm leading-6 text-red-300">{error}{error.includes("登录") ? <> <Link href={`/login?next=${encodeURIComponent(`/video/${sourceVideoId}`)}`} className="font-semibold underline">去登录</Link></> : null}</p> : null}
        <button type="submit" disabled={status === "uploading"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--tp-accent)] px-4 text-sm font-semibold text-[var(--tp-bg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60">
          {status === "uploading" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {status === "uploading" ? "正在导入…" : "导入字幕并开始学习"}
        </button>
      </form>
    </section>
  );
}
