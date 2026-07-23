"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buildBilibiliEmbedUrl, buildBilibiliWatchUrl, extractBilibiliVideoId } from "@/lib/bilibili/id";
import type { VideoMetadata } from "@/lib/types";

export type VideoPlayerHandle = {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
};

type VideoPlayerProps = {
  videoId: string;
  metadata?: VideoMetadata;
  fallbackTitle?: string;
  previewOnly?: boolean;
  initialStartTime?: number;
  platform?: "youtube" | "bilibili";
};

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ videoId, metadata, fallbackTitle, previewOnly = false, initialStartTime, platform = "youtube" }, ref) {
    const playerRef = useRef<YT.Player | null>(null);
    const apiLoadedRef = useRef(false);
    const bilibiliSourceId = platform === "bilibili"
      ? extractBilibiliVideoId(metadata?.providerUrl ?? videoId)
      : null;
    const bilibiliEmbedSupported = Boolean(bilibiliSourceId?.toUpperCase().startsWith("BV"));

    // 加载 YouTube IFrame API
    useEffect(() => {
      if (previewOnly || platform === "bilibili") return;
      if (apiLoadedRef.current) return;

      const onReady = (event: YT.PlayerEvent) => {
        playerRef.current = event.target;
        if (typeof initialStartTime === "number" && initialStartTime > 0) {
          event.target.seekTo(initialStartTime, true);
        }
      };

      const init = () => {
        apiLoadedRef.current = true;
        new window.YT.Player(`yt-player-${videoId}`, {
          events: { onReady },
        });
      };

      if (window.YT?.Player) {
        init();
      } else {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

        const prev = (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady as (() => void) | undefined;

        (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = () => {
          if (prev) prev();
          init();
        };

        apiLoadedRef.current = true;
        return () => {
          (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = prev ?? null;
        };
      }
    }, [initialStartTime, platform, previewOnly, videoId]);

    useImperativeHandle(
      ref,
      () => ({
        seekTo(seconds: number) {
          if (platform === "bilibili" && bilibiliSourceId) {
            window.open(buildBilibiliWatchUrl(bilibiliSourceId, seconds), "_blank", "noopener,noreferrer");
            return;
          }
          playerRef.current?.seekTo(seconds, true);
        },
        getCurrentTime() {
          if (platform === "bilibili") return 0;
          return playerRef.current?.getCurrentTime() ?? 0;
        },
      }),
      [bilibiliSourceId, platform]
    );

    return (
      <section className="overflow-hidden rounded-[0.875rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <div className="aspect-video w-full">
          {previewOnly ? (
            <div className="flex h-full flex-col items-center justify-center bg-[#0A1119] px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--tp-border-strong)] bg-[var(--tp-surface-raised)] text-[var(--tp-accent)]">
                <Play className="ml-1 h-6 w-6" aria-hidden />
              </span>
              <p className="mt-5 text-sm font-semibold text-[var(--tp-text)]">学习工作台演示状态</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--tp-text-muted)]">固定数据用于视觉验收，不加载播放器、不请求字幕或 AI。</p>
            </div>
          ) : platform === "bilibili" && bilibiliEmbedSupported && bilibiliSourceId ? (
            <iframe
              className="h-full w-full"
              src={buildBilibiliEmbedUrl(bilibiliSourceId, initialStartTime)}
              title={metadata?.title ?? "B 站视频播放器"}
              allow="autoplay; clipboard-write; fullscreen; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : platform === "bilibili" ? (
            <div className="flex h-full flex-col items-center justify-center bg-[#0A1119] px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--tp-border-strong)] bg-[var(--tp-surface-raised)] text-[var(--tp-accent)]">
                <Play className="ml-1 h-6 w-6" aria-hidden />
              </span>
              <p className="mt-5 text-sm font-semibold text-[var(--tp-text)]">在 B 站观看原视频</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--tp-text-muted)]">此链接暂不支持站内嵌入播放；学习字幕仍可在本页使用。</p>
              {bilibiliSourceId ? <a href={buildBilibiliWatchUrl(bilibiliSourceId, initialStartTime)} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--tp-accent)] px-4 text-sm font-semibold text-[var(--tp-bg)]">前往 B 站</a> : null}
            </div>
          ) : (
            <iframe
              id={`yt-player-${videoId}`}
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1${typeof initialStartTime === "number" && initialStartTime > 0 ? `&start=${Math.floor(initialStartTime)}` : ""}`}
              title={metadata?.title ?? "YouTube 视频播放器"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-[var(--tp-border)] bg-[var(--tp-surface)] p-4 sm:flex-row sm:items-center">
          <h1 className="break-words text-lg font-semibold leading-snug tracking-[-0.02em] text-[var(--tp-text)] sm:min-w-0 sm:flex-1">
            {metadata?.title ?? fallbackTitle ?? "正在加载视频信息…"}
          </h1>
          {metadata?.authorName ? (
            <Badge className="self-start sm:self-auto shrink-0">{metadata.authorName}</Badge>
          ) : null}
          {platform === "bilibili" ? <Badge className="self-start sm:self-auto shrink-0">Bilibili</Badge> : null}
        </div>
      </section>
    );
  }
);
