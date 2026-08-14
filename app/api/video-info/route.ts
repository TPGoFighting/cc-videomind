import { z } from "zod";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { withSecurity } from "@/lib/security/middleware";
import { extractYouTubeVideoId } from "@/lib/youtube/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { isLocalMode } from "@/lib/local-mode";
import { buildBilibiliWatchUrl, extractBilibiliVideoId } from "@/lib/bilibili/id";

const RequestSchema = z.object({
  url: z.string().min(1).max(500)
});

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 16 * 1024,
    scope: "video-info",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => {
      const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const inputUrl = parsed.data.url.trim();

  // 1. 判断是否为 B站 链接或 B站 ID
  const isBilibili =
    inputUrl.includes("bilibili.com") ||
    inputUrl.includes("b23.tv") ||
    /^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(inputUrl);

  if (isBilibili) {
    const bvid = extractBilibiliVideoId(inputUrl);
    if (!bvid) {
      return errorResponse(
        "invalid_bilibili_url",
        "请粘贴 B 站完整视频链接或 BV/av 号；不支持直接解析不透明短链接。",
        400,
      );
    }
    return successResponse({
      videoId: bvid,
      title: `B 站视频 ${bvid}`,
      authorName: "Bilibili",
      providerUrl: buildBilibiliWatchUrl(bvid),
      subtitleImportRequired: true,
    });
  }

  // 2. 否则走 YouTube 逻辑
  const youtubeId = extractYouTubeVideoId(inputUrl);
  if (!youtubeId) {
    return errorResponse("invalid_video_url", "Enter a valid public YouTube or Bilibili URL.", 400);
  }

  // The workspace only needs an id to start. In local mode, fetching complete
  // metadata through yt-dlp can take many seconds, so defer it to the
  // transcript load rather than making the entry interaction feel frozen.
  if (isLocalMode()) {
    return successResponse({
      videoId: youtubeId,
      title: "正在加载视频信息…",
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      providerUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    });
  }

  try {
    const metadata = await fetchYouTubeMetadata(youtubeId);
    return successResponse(metadata);
  } catch (error) {
    console.error("[video-info] YouTube元数据解析失败:", error);
    return errorResponse("metadata_unavailable", "Could not load YouTube metadata for this video.", 502);
  }
  });
}
