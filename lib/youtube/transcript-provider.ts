import { z } from "zod";
import { TranscriptSegmentSchema, type TranscriptSegment } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/utils/http";
import { buildYouTubeWatchUrl } from "@/lib/youtube/id";

export interface TranscriptProvider {
  getTranscript(videoId: string): Promise<TranscriptSegment[]>;
}

const CaptionTrackSchema = z.object({
  baseUrl: z.string().url(),
  languageCode: z.string().optional(),
  name: z.object({ simpleText: z.string().optional() }).optional()
});

const CaptionListSchema = z.array(CaptionTrackSchema);

export class YouTubeCaptionTranscriptProvider implements TranscriptProvider {
  async getTranscript(videoId: string) {
    const html = await this.fetchWatchHtml(videoId);
    const tracks = this.extractCaptionTracks(html);
    const track =
      tracks.find((item) => item.languageCode?.startsWith("en")) ?? tracks[0];

    if (!track) {
      throw new Error("No YouTube captions are available for this video.");
    }

    const response = await fetchWithTimeout(track.baseUrl, {
      timeoutMs: 10000,
      service: "YouTube captions"
    });
    const xml = await response.text();
    const segments = this.parseTimedText(xml);

    if (segments.length === 0) {
      throw new Error("YouTube captions were empty.");
    }

    return segments;
  }

  private async fetchWatchHtml(videoId: string) {
    const response = await fetchWithTimeout(buildYouTubeWatchUrl(videoId), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeoutMs: 12000,
      service: "YouTube watch page"
    });

    return response.text();
  }

  private extractCaptionTracks(html: string) {
    // 方法1：从 ytInitialPlayerResponse 中用括号计数法提取完整 JSON
    const tracks = this.extractFromPlayerResponse(html);
    if (tracks.length > 0) {
      return tracks;
    }

    // 方法2：正则提取（兜底，加上 s 标志支持多行）
    return this.extractWithRegex(html);
  }

  private extractFromPlayerResponse(html: string) {
    const marker = "ytInitialPlayerResponse";
    const startIndex = html.indexOf(marker);
    if (startIndex === -1) {
      return [];
    }

    // 找到第一个 {
    const braceStart = html.indexOf("{", startIndex);
    if (braceStart === -1) {
      return [];
    }

    // 括号计数，找到匹配的 }
    let depth = 0;
    let end = braceStart;
    let inString = false;
    let escape = false;

    for (let i = braceStart; i < html.length && i < braceStart + 2_000_000; i++) {
      const char = html[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === "\\") {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{") {
          depth++;
        } else if (char === "}") {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
    }

    if (depth !== 0) {
      return [];
    }

    try {
      const json = JSON.parse(html.slice(braceStart, end));
      const tracks =
        json?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) {
        return CaptionListSchema.parse(tracks);
      }
    } catch {
      // JSON 解析失败，继续下一个方法
    }

    return [];
  }

  private extractWithRegex(html: string) {
    // 使用 [\s\S] 跨行匹配（ES2017 兼容，等价于 s 标志）
    const match = html.match(
      /"captionTracks":(\[[\s\S]*?\])\s*,\s*"audioTracks"/
    );
    if (!match?.[1]) {
      // 尝试更宽松的模式（有些视频可能没有 audioTracks 字段）
      const altMatch = html.match(/"captionTracks":(\[[\s\S]*?\])\s*,/);
      if (!altMatch?.[1]) {
        return [];
      }

      try {
        return CaptionListSchema.parse(JSON.parse(altMatch[1]));
      } catch {
        return [];
      }
    }

    try {
      return CaptionListSchema.parse(JSON.parse(match[1]));
    } catch {
      return [];
    }
  }

  private parseTimedText(xml: string) {
    const matches = xml.matchAll(
      /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g
    );
    const segments: TranscriptSegment[] = [];

    for (const match of matches) {
      const startTime = Number(match[1]);
      const duration = Number(match[2]);
      const text = decodeHtml(
        match[3]?.replace(/<[^>]*>/g, " ").trim() ?? ""
      );

      if (Number.isFinite(startTime) && Number.isFinite(duration) && text) {
        segments.push(
          TranscriptSegmentSchema.parse({
            startTime,
            endTime: startTime + duration,
            text
          })
        );
      }
    }

    return segments;
  }
}

export class OfficialWebTranscriptProvider implements TranscriptProvider {
  private readonly transcriptUrls: Record<string, string> = {
    vif8NQcjVf0: "https://lexfridman.com/jensen-huang-transcript/"
  };

  async getTranscript(videoId: string) {
    const transcriptUrl = this.transcriptUrls[videoId];
    if (!transcriptUrl) {
      throw new Error("No official transcript mapping exists for this video.");
    }

    const response = await fetchWithTimeout(transcriptUrl, {
      timeoutMs: 15000,
      service: "official transcript"
    });
    const html = await response.text();
    const segments = this.parseLexTranscript(html);

    if (segments.length === 0) {
      throw new Error(
        "Official transcript page did not contain transcript segments."
      );
    }

    return segments;
  }

  private parseLexTranscript(html: string) {
    const matches = Array.from(
      html.matchAll(
        /<div class="ts-segment">[\s\S]*?<span class="ts-timestamp"><a[^>]*t=(\d+)[^>]*>\(([^)]*)\)<\/a>\s*<\/span>[\s\S]*?<span class="ts-text">([\s\S]*?)<\/span>[\s\S]*?<\/div>/g
      )
    );

    return matches.map((match, index) => {
      const startTime = Number(match[1]);
      const nextStartTime = Number(matches[index + 1]?.[1]);
      const text = decodeHtml(
        match[3]?.replace(/<[^>]*>/g, " ").trim() ?? ""
      );

      return TranscriptSegmentSchema.parse({
        startTime,
        endTime: Number.isFinite(nextStartTime)
          ? nextStartTime
          : startTime + 60,
        text
      });
    });
  }
}

class FallbackTranscriptProvider implements TranscriptProvider {
  constructor(
    private readonly primary: TranscriptProvider,
    private readonly fallback: TranscriptProvider
  ) {}

  async getTranscript(videoId: string) {
    try {
      return await this.primary.getTranscript(videoId);
    } catch {
      return this.fallback.getTranscript(videoId);
    }
  }
}

export function getTranscriptProvider(): TranscriptProvider {
  const provider = process.env.TRANSCRIPT_PROVIDER ?? "youtube";
  if (provider === "youtube") {
    return new FallbackTranscriptProvider(
      new YouTubeCaptionTranscriptProvider(),
      new OfficialWebTranscriptProvider()
    );
  }

  throw new Error(
    `TRANSCRIPT_PROVIDER "${provider}" is invalid. Set to "youtube".`
  );
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    );
}
