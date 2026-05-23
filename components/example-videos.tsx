"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Play, ArrowRight } from "lucide-react";

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
    return {
      videoId,
      title: "YouTube 视频",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channelName: "未知频道",
    };
  }
}

function VideoCard({ video, index }: { video: VideoCardData; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        delay: index * 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: cardRef });

  return (
    <div ref={cardRef}>
      <Link
        href={`/video/${video.videoId}`}
        className="group block rounded-2xl border border-white/6 bg-[#0a0a0a] overflow-hidden transition-all duration-500 hover:border-[#0099ff]/25 hover:shadow-[0_0_30px_rgba(0,153,255,0.08)]"
      >
        {/* 缩略图 — 更大比例 */}
        <div className="relative aspect-[16/10] bg-[#0d0d0d] overflow-hidden">
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            width={480}
            height={300}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            loading="lazy"
            unoptimized
          />
          {/* 渐变遮罩 + 播放按钮 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0099ff]/90 shadow-[0_0_30px_rgba(0,153,255,0.4)] transition-transform duration-300 group-hover:scale-110">
              <Play className="h-5 w-5 text-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* 信息 */}
        <div className="p-4 space-y-1.5">
          <h4 className="text-[14px] font-medium leading-snug text-white/80 line-clamp-2 group-hover:text-white transition-colors duration-300">
            {video.title}
          </h4>
          <p className="text-[12px] text-white/35">
            {video.channelName}
          </p>
        </div>
      </Link>
    </div>
  );
}

export function ExampleVideos() {
  const [videos, setVideos] = useState<VideoCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    const selected = pickRandom(VIDEO_IDS, 6);

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
    <section
      ref={sectionRef}
      className="relative mx-auto w-full max-w-full px-4 py-20 sm:max-w-[90%] sm:px-5 sm:py-28 md:max-w-[85%] lg:max-w-[80%]"
    >
      {/* 背景分割线 */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#0099ff]/20 to-transparent" />

      <div className="mb-12 text-center space-y-3">
        <span className="inline-block rounded-full border border-white/8 bg-white/[0.02] px-4 py-1.5 text-[12px] font-medium text-[#0099ff] tracking-wider uppercase">
          示例视频
        </span>
        <h2 className="text-[28px] sm:text-[40px] font-bold tracking-tight">
          不想粘贴链接？
          <span className="text-gradient"> 试试这些</span>
        </h2>
        <p className="text-[15px] text-[#a6a6a6] max-w-lg mx-auto">
          点击任意视频，即刻体验完整分析功能
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/6 bg-[#0a0a0a] overflow-hidden"
            >
              <div className="aspect-[16/10] bg-white/5 animate-breathe" />
              <div className="p-4 space-y-2">
                <div className="h-3.5 w-3/4 rounded-full bg-white/6 animate-breathe" />
                <div className="h-3 w-1/2 rounded-full bg-white/4 animate-breathe" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-5">
          {videos.map((video, i) => (
            <VideoCard key={video.videoId} video={video} index={i} />
          ))}
        </div>
      )}

      {/* 浏览更多链接 */}
      <div className="mt-10 text-center">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-[14px] text-white/30 hover:text-[#0099ff] transition-colors duration-300 group"
        >
          浏览更多视频
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
