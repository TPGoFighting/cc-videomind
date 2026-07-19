import { z } from "zod";
import { VideoMetadataSchema, type VideoMetadata } from "@/lib/types";
import { isLocalMode } from "@/lib/local-mode";
import { fetchJsonWithTimeout } from "@/lib/utils/http";
import { buildYouTubeWatchUrl } from "@/lib/youtube/id";
import { YtDlpTranscriptProvider } from "@/lib/youtube/yt-dlp-provider";

const YouTubeOEmbedSchema = z.object({
  title: z.string(),
  author_name: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
  provider_url: z.string().url().optional()
});

export async function fetchYouTubeMetadata(videoId: string): Promise<VideoMetadata> {
  const videoUrl = buildYouTubeWatchUrl(videoId);

  // A local-first build must not make the primary learning flow depend on a
  // public metadata proxy. yt-dlp already has the user's authenticated local
  // YouTube access and is used for captions as well.
  if (isLocalMode()) {
    const data = await new YtDlpTranscriptProvider().getMetadata(videoId);
    return VideoMetadataSchema.parse({ videoId, ...data });
  }

  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", videoUrl);
  endpoint.searchParams.set("format", "json");

  let data: z.infer<typeof YouTubeOEmbedSchema>;
  try {
    data = YouTubeOEmbedSchema.parse(
      await fetchJsonWithTimeout<unknown>(endpoint.toString(), {
        timeoutMs: 8000,
        service: "YouTube oEmbed"
      })
    );
  } catch {
    try {
      data = await fetchNoEmbedMetadata(videoId, videoUrl);
    } catch {
      // Metadata enriches the learning experience but must not be a hard
      // dependency for transcript extraction. Both public oEmbed endpoints
      // are commonly blocked by regional networks and proxies.
      return createFallbackMetadata(videoId, videoUrl);
    }
  }

  return VideoMetadataSchema.parse({
    videoId,
    title: data.title,
    authorName: data.author_name,
    thumbnailUrl: data.thumbnail_url,
    providerUrl: data.provider_url
  });
}

function createFallbackMetadata(videoId: string, videoUrl: string): VideoMetadata {
  return VideoMetadataSchema.parse({
    videoId,
    title: `YouTube 视频 ${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    providerUrl: videoUrl,
  });
}

async function fetchNoEmbedMetadata(videoId: string, videoUrl: string) {
  const endpoint = new URL("https://noembed.com/embed");
  endpoint.searchParams.set("url", videoUrl);

  return YouTubeOEmbedSchema.parse(
    await fetchJsonWithTimeout<unknown>(endpoint.toString(), {
      timeoutMs: 12000,
      service: "noembed YouTube metadata"
    })
  );
}
