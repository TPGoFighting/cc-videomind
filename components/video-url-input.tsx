"use client";

import { useId, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JsonResponse, VideoMetadata } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface VideoUrlInputProps {
  variant?: "default" | "editorial";
  submitLabel?: string;
  placeholder?: string;
  className?: string;
}

export function VideoUrlInput({
  variant = "default",
  submitLabel = "开始解析",
  placeholder = "粘贴 YouTube 或 B 站公开视频链接",
  className,
}: VideoUrlInputProps = {}) {
  const router = useRouter();
  const errorId = useId();
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
        setError(
          payload.error.code === "invalid_video_url"
            ? "请输入有效的 YouTube 或 B 站公开视频链接。"
            : payload.error.message,
        );
        return;
      }

      router.push(`/video/${payload.data.videoId}`);
    } catch {
      setError("无法解析此视频链接，请检查后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      aria-busy={loading}
      className={cn("flex w-full flex-col gap-2.5 sm:flex-row", className)}
    >
      <div className="flex-1">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={placeholder}
          aria-label="YouTube 或 B 站视频链接"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          required
          className={cn(
            "h-16 rounded-full border-2 px-8 text-[16px]",
            variant === "editorial" &&
              "h-14 rounded-lg border border-white/20 bg-[#0c131c] px-5 text-white shadow-none placeholder:text-white/40 hover:border-white/35 hover:bg-[#0e1721] focus-visible:bg-[#0e1721] sm:h-14",
          )}
        />
        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-red-400">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        disabled={loading}
        size="lg"
        data-magnetic
        className={cn(
          "h-16 shrink-0 px-8 text-[16px]",
          variant === "editorial" &&
            "h-14 min-w-36 rounded-lg bg-[#f4f7fa] px-7 text-[#08101a] shadow-[0_12px_34px_rgba(91,168,255,0.18)] hover:bg-white active:translate-y-px active:scale-[0.99] sm:h-14",
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ArrowRight className="h-4 w-4" aria-hidden />
        )}
        {submitLabel}
      </Button>
    </form>
  );
}
