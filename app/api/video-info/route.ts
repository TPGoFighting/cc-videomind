import { z } from "zod";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { extractYouTubeVideoId } from "@/lib/youtube/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";

const RequestSchema = z.object({
  url: z.string().min(1).max(500)
});

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(getClientKey(request, "video-info"), 30, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many requests. Try again shortly.", 429);
  }

  const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const videoId = extractYouTubeVideoId(parsed.data.url);
  if (!videoId) {
    return errorResponse("invalid_video_url", "Enter a valid public YouTube URL.", 400);
  }

  try {
    const metadata = await fetchYouTubeMetadata(videoId);
    return successResponse(metadata);
  } catch {
    return errorResponse("metadata_unavailable", "Could not load YouTube metadata for this video.", 502);
  }
}
