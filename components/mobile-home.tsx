"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import type { JsonResponse, VideoMetadata } from "@/lib/types";
import { AnimatedBackground } from "./animated-background";

const SUGGESTIONS = [
  { label: "教程", url: "https://www.youtube.com/watch?v=5puu3kN9l7c&pp=ugUEEgJlbg%3D%3D" },
  { label: "科技", url: "https://www.youtube.com/watch?v=lLX9Ls7FUGs" },
  { label: "音乐", url: "https://www.youtube.com/watch?v=oWOyUMJWptc&pp=0gcJCQQLAYcqIYzv" },
  { label: "Vlog", url: "https://www.youtube.com/watch?v=HZvj8T5_oUE&t=2859s" },
  { label: "演讲", url: "https://www.youtube.com/watch?v=LPZh9BOjkQs&pp=ugUHEgVlbi1VUw%3D%3D" },
  { label: "纪录片", url: "https://www.youtube.com/watch?v=ocGJWc2F1Yk" },
];

export function MobileHome() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) return;

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
        setLoading(false);
        return;
      }
      router.push(`/video/${payload.data.videoId}`);
    } catch {
      setError("无法解析此链接，请检查后重试。");
    } finally {
      setLoading(false);
    }
  }

  function fillSuggestion(suggestionUrl: string) {
    setUrl(suggestionUrl);
    setError(null);
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <AnimatedBackground variant="mobile" />

      {/* 主体内容 — 垂直居中 */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pt-[15vh] pb-20 page-enter">
        {/* Logo + 名称 */}
        <div className="flex flex-col items-center gap-3 mb-12">
          <Image
            src="/logo.png"
            alt="Teach Player"
            width={56}
            height={56}
            className="rounded-xl animate-float-slow"
          />
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">
            Teach Player
          </h1>
        </div>

        {/* 输入区域 */}
        <form onSubmit={submit} className="w-full max-w-md space-y-3">
          <div className="relative">
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="粘贴 YouTube 视频链接"
              aria-label="YouTube 视频链接"
              className="input-glow w-full h-[52px] rounded-2xl border border-white/10 bg-white/[0.06] px-5 pr-12 text-[15px] text-white placeholder:text-white/25 outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="btn-press absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-[#0099ff] text-white flex items-center justify-center transition-colors duration-200 hover:bg-[#0099ff]/90 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="开始解析"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </div>

          {error && (
            <p className="text-[13px] text-red-400 text-center">{error}</p>
          )}
        </form>

        {/* 建议标签 */}
        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => fillSuggestion(s.url)}
              className="btn-press rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-[13px] text-white/50 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.08] hover:text-white/70"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 底部提示 */}
        <p className="mt-8 text-[12px] text-white/20 text-center">
          支持 youtube.com / youtu.be / shorts / embed
        </p>
      </div>
    </div>
  );
}
