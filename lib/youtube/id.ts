import { z } from "zod";

export const VideoIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{6,20}$/, "Invalid YouTube video ID.");

export function extractYouTubeVideoId(input: string) {
  const trimmed = input.trim();
  const direct = VideoIdSchema.safeParse(trimmed);
  if (direct.success) {
    return direct.data;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname === "youtu.be") {
    return VideoIdSchema.safeParse(url.pathname.slice(1)).success ? url.pathname.slice(1) : null;
  }

  if (hostname.endsWith("youtube.com")) {
    const watchId = url.searchParams.get("v");
    if (watchId && VideoIdSchema.safeParse(watchId).success) {
      return watchId;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const candidate = parts.at(-1);
    if (candidate && ["embed", "shorts", "live"].includes(parts[0] ?? "") && VideoIdSchema.safeParse(candidate).success) {
      return candidate;
    }
  }

  return null;
}

export function buildYouTubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
