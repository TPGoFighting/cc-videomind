"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

const VIDEO_IDS = [
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
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const endpoint = new URL("https://www.youtube.com/oembed");
    endpoint.searchParams.set("url", videoUrl);
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
    // fallback: use YouTube thumbnail
    return {
      videoId,
      title: "YouTube 视频",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelName: "未知频道",
    };
  }
}

export function ExampleVideos() {
  const [videos, setVideos] = useState<VideoCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const selected = pickRandom(VIDEO_IDS, 5);

    async function load() {
      const results = (await Promise.all(selected.map(fetchVideoMeta))).filter(
        Boolean,
      ) as VideoCardData[];
      if (!cancelled) {
        setVideos(results);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative mx-auto w-full max-w-full px-4 py-12 sm:max-w-[90%] sm:px-5 sm:py-16 md:max-w-[85%] lg:max-w-[80%]">
      <div className="mb-8 text-center space-y-3">
        <h2 className="text-[22px] font-bold tracking-tight sm:text-[28px]">
          不想粘贴链接？试试这些
        </h2>
        <p className="text-[14px] text-[#a6a6a6] max-w-lg mx-auto">
          点击任意视频，即刻体验完整分析功能
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/6 bg-[#0a0a0a] overflow-hidden"
            >
              <div className="aspect-video bg-white/5 animate-breathe" />
              <div className="p-3.5 space-y-2">
                <div className="h-3.5 w-3/4 rounded-full bg-white/6 animate-breathe" />
                <div className="h-3 w-1/2 rounded-full bg-white/4 animate-breathe" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {videos.map((video) => (
            <div key={video.videoId}>
              <Link
                href={`/video/${video.videoId}`}
                className="card-lift group rounded-xl border border-white/6 bg-[#0a0a0a] overflow-hidden transition-colors hover:border-[#0099ff]/20 block"
              >
                {/* 缩略图 */}
                <div className="relative aspect-video bg-[#0d0d0d] overflow-hidden">
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    width={280}
                    height={158}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    unoptimized
                  />
                  {/* 播放按钮叠加 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0099ff]/90">
                      <Play className="h-4 w-4 text-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* 信息 */}
                <div className="p-3.5 space-y-1.5">
                  <h4 className="text-[14px] font-medium leading-snug text-white/80 line-clamp-2 group-hover:text-white transition-colors">
                    {video.title}
                  </h4>
                  <p className="text-[12px] text-white/35">
                    {video.channelName}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
