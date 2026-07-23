import { z } from "zod";

export const BilibiliVideoIdSchema = z
  .string()
  .regex(/^(BV[a-zA-Z0-9]{10}|av\d+)$/i, "Invalid Bilibili video ID.");

/**
 * A private workspace created from user-supplied subtitles or authorized
 * media. These IDs intentionally cannot collide with a public Bilibili video
 * ID or its shared cache entry.
 */
export const BilibiliImportedVideoIdSchema = z
  .string()
  .regex(/^bili_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "Invalid imported Bilibili workspace ID.");

export function isBilibiliVideoId(value: string): boolean {
  return BilibiliVideoIdSchema.safeParse(value).success;
}

export function isBilibiliImportedVideoId(value: string): boolean {
  return BilibiliImportedVideoIdSchema.safeParse(value).success;
}

/**
 * 提取 B站 视频 ID (支持 BV 号和 av 号)
 */
export function extractBilibiliVideoId(input: string): string | null {
  const trimmed = input.trim();

  // 1. 直接匹配完整的 BV 号
  if (/^BV[a-zA-Z0-9]{10}$/i.test(trimmed)) {
    return trimmed;
  }

  // 2. 直接匹配完整的 av 号
  if (/^av\d+$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace(/^www\./, "");

    // 处理 bilibili.com 域名
    if (hostname.endsWith("bilibili.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      // 匹配 /video/BVxxxxx 或 /video/avxxxxx
      const videoIndex = parts.indexOf("video");
      if (videoIndex >= 0 && parts[videoIndex + 1]) {
        const candidate = parts[videoIndex + 1];
        if (/^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(candidate)) {
          return candidate;
        }
      }
    }

    // b23.tv 只有在路径本身就是 BV/av 号时才可离线识别。普通短码必须
    // 由用户在 B 站中打开后复制完整视频链接，服务端不跟踪其重定向。
    if (hostname === "b23.tv") {
      const path = url.pathname.slice(1);
      if (/^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(path)) {
        return path;
      }
    }
  } catch {
    // 降级正则模糊抓取
    const looseBv = trimmed.match(/(BV[a-zA-Z0-9]{10})/i);
    if (looseBv?.[1]) return looseBv[1];

    const looseAv = trimmed.match(/(av\d+)/i);
    if (looseAv?.[1]) return looseAv[1];
  }

  return null;
}

/**
 * 兼容旧调用方：不再从服务端跟踪 B站短链接重定向。
 *
 * 自动追踪不透明短链接会把产品带回抓取链路；调用方应提示用户粘贴
 * BV/av 号或完整公开链接。
 */
export async function resolveBilibiliUrl(input: string): Promise<string> {
  return input.trim();
}

/**
 * 构造 B站 视频的规范 Web 访问地址
 */
export function buildBilibiliWatchUrl(videoId: string, startTime?: number) {
  const url = new URL(`https://www.bilibili.com/video/${encodeURIComponent(videoId)}`);
  if (typeof startTime === "number" && Number.isFinite(startTime) && startTime > 0) {
    url.searchParams.set("t", String(Math.floor(startTime)));
  }
  return url.toString();
}

export function buildBilibiliEmbedUrl(videoId: string, startTime?: number) {
  const parsed = BilibiliVideoIdSchema.parse(videoId);
  const params = new URLSearchParams({
    bvid: parsed,
    high_quality: "1",
    danmaku: "0",
  });
  if (typeof startTime === "number" && Number.isFinite(startTime) && startTime > 0) {
    params.set("t", String(Math.floor(startTime)));
  }
  return `https://player.bilibili.com/player.html?${params.toString()}`;
}
