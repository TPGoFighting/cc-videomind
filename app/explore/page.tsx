"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Play, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AnimatedBackground } from "@/components/animated-background";

const CURATED_IDS = [
  "5puu3kN9l7c", "lLX9Ls7FUGs", "LPZh9BOjkQs", "ocGJWc2F1Yk",
  "oWOyUMJWptc", "HZvj8T5_oUE", "8Ve5SAFPYZ8", "i9TvUGeTltE",
  "aJSK3HZlvnU", "s1-pfiVMKAs", "dQw4w9WgXcQ", "jNQXAC9IVRw",
];

interface VideoMeta {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
}

async function fetchVideoMeta(videoId: string): Promise<VideoMeta | null> {
  try {
    const endpoint = new URL("https://www.youtube.com/oembed");
    endpoint.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
    endpoint.searchParams.set("format", "json");

    const res = await fetch(endpoint.toString());
    if (!res.ok) throw new Error("oEmbed failed");
    const data = await res.json();

    return {
      videoId,
      title: data.title ?? "未命名视频",
      thumbnailUrl: data.thumbnail_url ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
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

function VideoCard({ video, index }: { video: VideoMeta; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.5,
        delay: index * 0.06,
        ease: "power3.out",
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 92%",
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0099ff]/90 shadow-[0_0_30px_rgba(0,153,255,0.4)] transition-transform duration-300 group-hover:scale-110">
              <Play className="h-5 w-5 text-white ml-0.5" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-1.5">
          <h4 className="text-[14px] font-medium leading-snug text-white/80 line-clamp-2 group-hover:text-white transition-colors duration-300">
            {video.title}
          </h4>
          <p className="text-[12px] text-white/35">{video.channelName}</p>
        </div>
      </Link>
    </div>
  );
}

export default function ExplorePage() {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = (await Promise.all(CURATED_IDS.map(fetchVideoMeta))).filter(Boolean) as VideoMeta[];
      if (!cancelled) {
        setVideos(results);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <AnimatedBackground />

      <main className="relative z-10 mx-auto w-full max-w-full px-4 pt-28 pb-20 sm:max-w-[90%] sm:px-5 sm:pt-36 md:max-w-[85%] lg:max-w-[80%]">
        {/* 返回链接 */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[14px] text-white/35 hover:text-[#0099ff] transition-colors duration-300 mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          返回首页
        </Link>

        {/* 标题 */}
        <div className="mb-12 space-y-3">
          <span className="inline-block rounded-full border border-white/8 bg-white/[0.02] px-4 py-1.5 text-[12px] font-medium text-[#0099ff] tracking-wider uppercase">
            发现
          </span>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-extrabold tracking-[-0.02em] leading-[1.08]">
            探索更多
            <span className="text-gradient"> 学习视频</span>
          </h1>
          <p className="text-[15px] text-[#a6a6a6] max-w-lg">
            精选优质 YouTube 视频，点击任意视频即可体验 AI 分析功能。
          </p>
        </div>

        {/* 视频网格 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/6 bg-[#0a0a0a] overflow-hidden">
                <div className="aspect-[16/10] bg-white/5 animate-breathe" />
                <div className="p-4 space-y-2">
                  <div className="h-3.5 w-3/4 rounded-full bg-white/6 animate-breathe" />
                  <div className="h-3 w-1/2 rounded-full bg-white/4 animate-breathe" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {videos.map((video, i) => (
              <VideoCard key={video.videoId} video={video} index={i} />
            ))}
          </div>
        )}

        {/* 底部 CTA */}
        <div className="mt-20 text-center">
          <div className="relative overflow-hidden rounded-3xl border border-white/6 bg-[#050510] px-6 py-12 sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute -top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#0099ff]/[0.03] blur-[100px]" />
            <div className="relative space-y-4">
              <h2 className="text-[24px] sm:text-[32px] font-bold tracking-tight">
                有自己的视频想分析？
              </h2>
              <p className="text-[15px] text-[#a6a6a6] max-w-md mx-auto">
                粘贴任意 YouTube 链接到首页，秒级获取完整分析报告。
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-[#0099ff] px-6 py-2.5 text-[14px] font-medium text-white transition-all duration-300 hover:bg-[#33adff] hover:shadow-[0_0_25px_rgba(0,153,255,0.3)]"
              >
                回到首页
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
