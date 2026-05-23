"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

const VIDEO_IDS = [
  "5puu3kN9l7c", "lLX9Ls7FUGs", "LPZh9BOjkQs",
  "ocGJWc2F1Yk", "oWOyUMJWptc", "HZvj8T5_oUE",
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

function VideoCard({ video, index }: { video: VideoCardData; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0,
        duration: 0.6,
        delay: index * 0.08,
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
        className="group block"
      >
        <div className="relative aspect-[16/10] bg-[var(--surface)] overflow-hidden mb-3">
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            width={480}
            height={300}
            className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-70"
            loading="lazy"
            unoptimized
          />
        </div>
        <h4 className="text-[14px] font-[500] leading-snug text-[var(--text-primary)] line-clamp-2 mb-1 group-hover:text-[var(--accent)] transition-colors duration-300">
          {video.title}
        </h4>
        <p className="text-[12px] text-[var(--text-tertiary)]">{video.channelName}</p>
      </Link>
    </div>
  );
}

export function ExampleVideos() {
  const [videos, setVideos] = useState<VideoCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const selected = pickRandom(VIDEO_IDS, 6);
    async function load() {
      const results = (await Promise.all(selected.map(fetchVideoMeta))).filter(Boolean) as VideoCardData[];
      if (!cancelled) { setVideos(results); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="relative mx-auto w-full max-w-full px-4 py-28 sm:max-w-[90%] sm:px-5 sm:py-40 md:max-w-[85%] lg:max-w-[80%]">
      <div className="absolute left-0 top-0 w-[60px] h-px bg-[var(--text-tertiary)]/30" />

      <div className="mb-20">
        <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-[var(--text-tertiary)]">
          示例
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[16/10] bg-[var(--surface)] animate-breathe mb-3" />
              <div className="h-3.5 w-3/4 bg-white/5 animate-breathe rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
          {videos.map((video, i) => (
            <VideoCard key={video.videoId} video={video} index={i} />
          ))}
        </div>
      )}

      <Link
        href="/explore"
        className="inline-block mt-12 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors duration-300"
      >
        浏览更多 →
      </Link>
    </section>
  );
}
