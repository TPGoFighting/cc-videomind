"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import type { VideoMetadata } from "@/lib/types";

export type VideoPlayerHandle = {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
};

type VideoPlayerProps = {
  videoId: string;
  metadata?: VideoMetadata;
  fallbackTitle?: string;
};

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ videoId, metadata, fallbackTitle }, ref) {
    const playerRef = useRef<YT.Player | null>(null);
    const apiLoadedRef = useRef(false);

    // 加载 YouTube IFrame API
    useEffect(() => {
      if (apiLoadedRef.current) return;

      const onReady = (event: YT.PlayerEvent) => {
        playerRef.current = event.target;
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
    }, [videoId]);

    useImperativeHandle(
      ref,
      () => ({
        seekTo(seconds: number) {
          playerRef.current?.seekTo(seconds, true);
        },
        getCurrentTime() {
          return playerRef.current?.getCurrentTime() ?? 0;
        },
      }),
      []
    );

    return (
      <section className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-[rgba(0,153,255,0.08)_0px_0px_0px_1px]">
        <div className="aspect-video w-full">
          <iframe
            id={`yt-player-${videoId}`}
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1`}
            title={metadata?.title ?? "YouTube 视频播放器"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <div className="flex flex-col gap-2 border-t border-white/8 bg-[#090909] p-4 sm:flex-row sm:items-center">
          <h1 className="text-[17px] font-semibold leading-snug tracking-[-0.01em] sm:flex-1 sm:min-w-0 break-words">
            {metadata?.title ?? fallbackTitle ?? "正在加载视频信息…"}
          </h1>
          {metadata?.authorName ? (
            <Badge className="self-start sm:self-auto shrink-0">{metadata.authorName}</Badge>
          ) : null}
        </div>
      </section>
    );
  }
);
