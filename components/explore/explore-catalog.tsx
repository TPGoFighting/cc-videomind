"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Captions, Clock3, Gauge, Languages } from "lucide-react";
import {
  LEARNING_CATALOG,
  LEARNING_TOPICS,
  type LearningTopic,
} from "@/lib/explore/catalog";

type TopicFilter = "全部" | LearningTopic;

export function ExploreCatalog() {
  const [topic, setTopic] = useState<TopicFilter>("全部");
  const visibleVideos = topic === "全部"
    ? LEARNING_CATALOG
    : LEARNING_CATALOG.filter((video) => video.topic === topic);

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center gap-2" aria-label="按学习目标筛选">
        {LEARNING_TOPICS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={topic === item}
            onClick={() => setTopic(item)}
            className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors aria-pressed:border-[var(--tp-accent)] aria-pressed:bg-[rgba(91,168,255,0.14)] aria-pressed:text-[var(--tp-text)] border-[var(--tp-border)] text-[var(--tp-text-muted)] hover:border-[var(--tp-border-strong)] hover:text-[var(--tp-text)]"
          >
            {item}
          </button>
        ))}
        <p className="ml-auto text-sm text-[var(--tp-text-faint)]" aria-live="polite">
          {visibleVideos.length} 条已核对视频
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleVideos.map((video, index) => (
          <article
            key={video.videoId}
            className="group overflow-hidden rounded-[0.875rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--tp-border-strong)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.32)]"
          >
            <Link href={`/video/${video.videoId}`} className="relative block aspect-video overflow-hidden bg-[var(--tp-bg-secondary)]">
              <Image
                src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                alt={`${video.title} 视频缩略图`}
                fill
                sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                priority={index === 0}
                unoptimized
              />
              <span className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 font-mono text-xs text-white">
                {video.duration}
              </span>
            </Link>

            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--tp-accent)]">{video.topic}</span>
                <span className="text-xs text-[var(--tp-text-faint)]">核对：{video.verifiedAt}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-7 tracking-[-0.025em] text-[var(--tp-text)]">
                {video.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--tp-text-muted)]">{video.creator}</p>

              <dl className="mt-5 grid grid-cols-2 gap-2 text-sm text-[var(--tp-text-secondary)]">
                <div className="flex min-h-11 items-center gap-2 rounded-lg bg-white/[0.035] px-3">
                  <Languages className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
                  <dt className="sr-only">语言</dt><dd>{video.language}</dd>
                </div>
                <div className="flex min-h-11 items-center gap-2 rounded-lg bg-white/[0.035] px-3">
                  <Gauge className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
                  <dt className="sr-only">难度</dt><dd>{video.level}</dd>
                </div>
                <div className="flex min-h-11 items-center gap-2 rounded-lg bg-white/[0.035] px-3">
                  <Clock3 className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
                  <dt className="sr-only">时长</dt><dd>{video.duration}</dd>
                </div>
                <div className="flex min-h-11 items-center gap-2 rounded-lg bg-white/[0.035] px-3">
                  <Captions className="h-4 w-4 text-[var(--tp-accent)]" aria-hidden />
                  <dt className="sr-only">字幕</dt><dd>{video.captions}</dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-[var(--tp-border)] pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tp-text-faint)]">你会学到</p>
                <p className="mt-2 min-h-14 text-sm leading-6 text-[var(--tp-text-secondary)]">{video.outcome}</p>
              </div>

              <Link
                href={`/video/${video.videoId}`}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-between rounded-lg bg-[var(--tp-text)] px-4 text-sm font-semibold text-[var(--tp-bg)] transition-colors hover:bg-white"
              >
                开始学习
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
