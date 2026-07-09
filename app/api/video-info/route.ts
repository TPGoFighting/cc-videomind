import { z } from "zod";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { withSecurity } from "@/lib/security/middleware";
import { extractYouTubeVideoId } from "@/lib/youtube/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";

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
    try {
      const { resolveBilibiliUrl, extractBilibiliVideoId } = await import("@/lib/bilibili/id");
      const { fetchBilibiliMetadata } = await import("@/lib/bilibili/metadata");

      const resolvedUrl = await resolveBilibiliUrl(inputUrl);
      const bvid = extractBilibiliVideoId(resolvedUrl);

      if (!bvid) {
        return errorResponse("invalid_video_url", "Enter a valid Bilibili video URL or BV ID.", 400);
      }

      const metadata = await fetchBilibiliMetadata(bvid);
      return successResponse(metadata);
    } catch (error) {
      console.error("[video-info] B站元数据解析失败:", error);
      return errorResponse("metadata_unavailable", "Could not load Bilibili metadata for this video.", 502);
    }
  }

  // 2. 否则走 YouTube 逻辑
  const youtubeId = extractYouTubeVideoId(inputUrl);
  if (!youtubeId) {
    return errorResponse("invalid_video_url", "Enter a valid public YouTube or Bilibili URL.", 400);
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

