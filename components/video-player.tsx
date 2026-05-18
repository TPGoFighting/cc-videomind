import { Badge } from "@/components/ui/badge";
import type { VideoMetadata } from "@/lib/types";

type VideoPlayerProps = {
  videoId: string;
  metadata?: VideoMetadata;
};

export function VideoPlayer({ videoId, metadata }: VideoPlayerProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-[rgba(0,153,255,0.08)_0px_0px_0px_1px]">
      <div className="aspect-video w-full">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`}
          title={metadata?.title ?? "YouTube 视频播放器"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-white/8 bg-[#090909] p-4">
        <h1 className="min-w-0 flex-1 text-[17px] font-semibold leading-snug tracking-[-0.01em]">
          {metadata?.title ?? "正在加载视频信息…"}
        </h1>
        {metadata?.authorName ? (
          <Badge>{metadata.authorName}</Badge>
        ) : null}
      </div>
    </section>
  );
}
