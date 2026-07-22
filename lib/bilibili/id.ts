import { z } from "zod";

export const BilibiliVideoIdSchema = z
  .string()
  .regex(/^(BV[a-zA-Z0-9]{10}|av\d+)$/i, "Invalid Bilibili video ID.");

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

    // 处理 b23.tv 短域名 (形如 b23.tv/BV17p4y1X7qC 直连)
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
 * 解析 B站 短链接重定向 (b23.tv/xxxxxx) 并返回最终真实的视频 URL
 */
export async function resolveBilibiliUrl(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed.startsWith("http")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.replace(/^www\./, "");

    // 如果是 b23.tv 且路径不是直接 BV/av 号，说明是需要追踪重定向的短链接
    if (hostname === "b23.tv" && !/^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(url.pathname.slice(1))) {
      console.log(`[Bilibili:ID] 检测到 B站短链接，开始追踪重定向: ${trimmed}`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      let response: Response;
      try {
        response = await fetch(trimmed, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          redirect: "manual",
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (location) {
          console.log(`[Bilibili:ID] 重定向成功 -> ${location}`);
          return location;
        }
      }
    }
  } catch (error) {
    console.error(`[Bilibili:ID] 短链接还原失败:`, error);
  }

  return trimmed;
}

/**
 * 构造 B站 视频的规范 Web 访问地址
 */
export function buildBilibiliWatchUrl(videoId: string) {
  return `https://www.bilibili.com/video/${encodeURIComponent(videoId)}`;
}
