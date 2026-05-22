"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Play } from "lucide-react";
import type { JsonResponse, VideoMetadata } from "@/lib/types";
import { AnimatedBackground } from "./animated-background";

const SUGGESTIONS = [
  {
    label: "访谈",
    url: "https://www.youtube.com/watch?v=5puu3kN9l7c&pp=ugUEEgJlbg%3D%3D",
  },
  { label: "科技", url: "https://www.youtube.com/watch?v=lLX9Ls7FUGs" },
  {
    label: "数学",
    url: "https://www.youtube.com/watch?v=LPZh9BOjkQs&pp=ugUHEgVlbi1VUw%3D%3D",
  },
  { label: "脱口秀", url: "https://www.youtube.com/watch?v=ocGJWc2F1Yk" },
];

const FEATURED_IDS = [
  "5puu3kN9l7c",
  "lLX9Ls7FUGs",
  "LPZh9BOjkQs",
  "ocGJWc2F1Yk",
  "oWOyUMJWptc",
  "HZvj8T5_oUE",
  "8Ve5SAFPYZ8",
  "i9TvUGeTltE",
  "aJSK3HZlvnU",
  "s1-pfiVMKAs",
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface VideoCardData {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
}

async function fetchVideoMeta(videoId: string): Promise<VideoCardData | null> {
  try {
    const endpoint = new URL("https://www.youtube.com/oembed");
    endpoint.searchParams.set(
      "url",
      `https://www.youtube.com/watch?v=${videoId}`,
    );
    endpoint.searchParams.set("format", "json");
    const res = await fetch(endpoint.toString());
    if (!res.ok) throw new Error("oEmbed failed");
    const data = await res.json();
    return {
      videoId,
      title: data.title ?? "未命名视频",
      thumbnailUrl:
        data.thumbnail_url ??
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelName: data.author_name ?? "未知频道",
    };
  } catch {
    return {
      videoId,
      title: "YouTube 视频",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelName: "未知频道",
    };
  }
}

export function MobileHome() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 随机推荐视频
  const [videos, setVideos] = useState<VideoCardData[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const selected = pickRandom(FEATURED_IDS, 2);
    async function load() {
      const results = (await Promise.all(selected.map(fetchVideoMeta))).filter(
        Boolean,
      ) as VideoCardData[];
      if (!cancelled) {
        setVideos(results);
        setVideosLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <div className="flex-1 flex flex-col items-center justify-center px-5 pt-[10vh] pb-20 page-enter">
        {/* Logo + 名称 */}
        <div className="flex flex-col items-center gap-3 mb-10">
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
        <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-md">
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

        {/* 推荐视频卡片 */}
        <div className="mt-8 w-full max-w-md">
          <p className="text-[12px] text-white/25 text-center mb-3">
            或者试试这些
          </p>
          {videosLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3"
                >
                  <div className="w-28 h-16 rounded-lg bg-white/5 animate-breathe shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 w-full rounded-full bg-white/6 animate-breathe" />
                    <div className="h-3 w-2/3 rounded-full bg-white/4 animate-breathe" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((video) => (
                <Link
                  key={video.videoId}
                  href={`/video/${video.videoId}`}
                  className="card-lift group flex gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 transition-colors hover:border-[#0099ff]/20 active:scale-[0.98]"
                >
                  <div className="relative w-28 h-16 shrink-0 rounded-lg overflow-hidden bg-[#0d0d0d]">
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      width={112}
                      height={64}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      unoptimized
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h3 className="text-[13px] font-medium leading-snug text-white/70 line-clamp-2 group-hover:text-white/90 transition-colors">
                      {video.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-white/35">
                      {video.channelName}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <p className="mt-8 text-[12px] text-white/20 text-center">
          支持 youtube.com / youtu.be / shorts / embed
        </p>
      </div>
    </div>
  );
}
