"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JsonResponse, VideoMetadata } from "@/lib/types";

export function VideoUrlInput() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as JsonResponse<VideoMetadata>;
      if (!payload.ok) {
        setError(payload.error.message);
        return;
      }

      router.push(`/video/${payload.data.videoId}`);
    } catch {
      setError("无法解析此 YouTube 链接，请检查后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2.5 sm:flex-row">
      <div className="flex-1">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="粘贴 YouTube 公开视频链接"
          aria-label="YouTube 视频链接"
          required
          className="h-13 rounded-full px-6 text-[15px]"
        />
        {error ? (
          <p className="mt-1.5 text-[13px] font-medium text-red-400">{error}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={loading} size="lg" className="h-13 shrink-0">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ArrowRight className="h-4 w-4" aria-hidden />
        )}
        开始解析
      </Button>
    </form>
  );
}
