import { z } from "zod";
import { VideoMetadataSchema, type VideoMetadata } from "@/lib/types";
import { fetchJsonWithTimeout } from "@/lib/utils/http";
import { buildYouTubeWatchUrl } from "@/lib/youtube/id";

const YouTubeOEmbedSchema = z.object({
  title: z.string(),
  author_name: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
  provider_url: z.string().url().optional()
});

export async function fetchYouTubeMetadata(videoId: string): Promise<VideoMetadata> {
  const videoUrl = buildYouTubeWatchUrl(videoId);
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
    data = await fetchNoEmbedMetadata(videoId, videoUrl);
  }

  return VideoMetadataSchema.parse({
    videoId,
    title: data.title,
    authorName: data.author_name,
    thumbnailUrl: data.thumbnail_url,
    providerUrl: data.provider_url
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
