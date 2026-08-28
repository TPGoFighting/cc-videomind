import { extractVideoId, isBilibiliVideoId } from "@teach-player/shared";

export type ParsedVideoInput = ReturnType<typeof extractVideoId>;

/** Parse a strict video id or a supported provider URL from a mobile form. */
export function parseVideoInput(value: string): ParsedVideoInput {
  const input = value.trim();
  if (!input) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(input) || isBilibiliVideoId(input)) {
    return extractVideoId(input);
  }

  if (!/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|bilibili\.com|b23\.tv)(?:\/|$)/i.test(input)) {
    return null;
  }

  return extractVideoId(input);
}

export function importedVideoTitle(video: NonNullable<ParsedVideoInput>): string {
  return video.provider === "bilibili"
    ? `B站视频 · ${video.id}`
    : `YouTube 视频 · ${video.id}`;
}

export function userFacingError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return fallback;
  if (/network request failed|network error|failed to fetch/i.test(message)) {
    return "网络连接失败，请检查网络后重试。";
  }
  if (/request timed out|timeout|timed out/i.test(message)) {
    return "请求超时，请稍后重试。";
  }
  return message;
}

export function isYoutubeVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(value.trim()) && !isBilibiliVideoId(value);
}

export function formatDuration(seconds?: number | null): string {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return "待解析";
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}
