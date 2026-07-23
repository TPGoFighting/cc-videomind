import { VideoMetadataSchema, type VideoMetadata } from "@/lib/types";
import { buildBilibiliWatchUrl, BilibiliVideoIdSchema } from "@/lib/bilibili/id";

export type BilibiliViewData = {
  bvid: string;
  aid: number;
  cid: number;
  pic: string;
  title: string;
  desc?: string;
  duration: number;
  owner: { name: string };
};

/**
 * Build safe, user-visible metadata for a Bilibili URL.
 *
 * We deliberately do not call undocumented Bilibili web endpoints here.
 * Official metadata can be enriched later through a documented integration.
 */
export async function fetchBilibiliMetadata(videoId: string): Promise<VideoMetadata & { description: string; cid: number; duration: number }> {
  const parsedVideoId = BilibiliVideoIdSchema.parse(videoId);
  const metadata = VideoMetadataSchema.parse({
    videoId: parsedVideoId,
    title: `B 站视频 ${parsedVideoId}`,
    authorName: "Bilibili",
    providerUrl: buildBilibiliWatchUrl(parsedVideoId),
  });
  return { ...metadata, description: "", cid: 0, duration: 0 };
}
