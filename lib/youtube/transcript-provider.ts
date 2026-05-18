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

// YouTube 视频页默认包含 ytInitialPlayerResponse
// 其中 captions.playerCaptionsTracklistRenderer.captionTracks 包含所有字幕轨道
export class YouTubeCaptionTranscriptProvider implements TranscriptProvider {
  async getTranscript(videoId: string) {
    const html = await this.fetchWatchHtml(videoId);
    const tracks = this.extractCaptionTracks(html);
    const track =
      tracks.find((item) => item.languageCode?.startsWith("en")) ?? tracks[0];

    if (!track) {
      throw new Error("此视频没有可用的 YouTube 字幕。");
    }

    const response = await fetchWithTimeout(track.baseUrl, {
      timeoutMs: 10000,
      service: "YouTube captions"
    });
    const xml = await response.text();
    const segments = this.parseTimedText(xml);

    if (segments.length === 0) {
      throw new Error("YouTube 字幕内容为空。");
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
    // 方法1：括号计数提取 ytInitialPlayerResponse 完整 JSON
    let tracks = this.extractFromPlayerResponse(html);
    if (tracks.length > 0) return tracks;

    // 方法2：正则跨行提取
    tracks = this.extractWithRegex(html);
    if (tracks.length > 0) return tracks;

    // 方法3：从 ytInitialData 提取（有些页面结构不同）
    tracks = this.extractFromInitialData(html);
    return tracks;
  }

  private extractFromPlayerResponse(html: string) {
    const marker = "ytInitialPlayerResponse";
    const startIndex = html.indexOf(marker);
    if (startIndex === -1) return [];

    const json = this.extractJsonObject(html, startIndex);
    if (!json) return [];

    try {
      const tracks =
        json?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) {
        return CaptionListSchema.parse(tracks);
      }
    } catch {
      // JSON 解析失败
    }

    return [];
  }

  private extractFromInitialData(html: string) {
    const marker = "ytInitialData";
    const startIndex = html.indexOf(marker);
    if (startIndex === -1) return [];

    const json = this.extractJsonObject(html, startIndex);
    if (!json) return [];

    try {
      const tracks = get(
        json,
        "player",
        "captions",
        "playerCaptionsTracklistRenderer",
        "captionTracks"
      );
      if (Array.isArray(tracks) && tracks.length > 0) {
        return CaptionListSchema.parse(tracks);
      }
    } catch {
      // JSON 解析失败
    }

    return [];
  }

  // 括号计数：从 marker 之后的第一个 { 开始，找到匹配的 }
  private extractJsonObject(html: string, markerIndex: number) {
    const braceStart = html.indexOf("{", markerIndex);
    if (braceStart === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (
      let i = braceStart;
      i < html.length && i < braceStart + 3_000_000;
      i++
    ) {
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
            try {
              return JSON.parse(html.slice(braceStart, i + 1));
            } catch {
              return null;
            }
          }
        }
      }
    }

    return null;
  }

  private extractWithRegex(html: string) {
    // [\s\S] 等价于 s 标志（ES2017 兼容）
    const match = html.match(
      /"captionTracks":(\[[\s\S]*?\])\s*,\s*"audioTracks"/
    );
    if (!match?.[1]) {
      const altMatch = html.match(/"captionTracks":(\[[\s\S]*?\])\s*,/);
      if (!altMatch?.[1]) return [];
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

// InnerTube API 回退方案
// YouTube 内部 API，比 HTML 抓取更可靠
// 参考：https://github.com/Kakulukian/youtube-transcript
export class InnerTubeTranscriptProvider implements TranscriptProvider {
  async getTranscript(videoId: string) {
    const html = await this.fetchWatchHtml(videoId);
    const apiKey = this.extractApiKey(html);
    if (!apiKey) {
      throw new Error("无法获取 YouTube API 密钥。");
    }

    const segments = await this.callInnerTubeApi(videoId, apiKey);
    if (segments.length === 0) {
      throw new Error("InnerTube API 未返回字幕。");
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

  private extractApiKey(html: string) {
    // 尝试多种常见的 API key 格式
    for (const pattern of [
      /"(?:INNERTUBE_API_KEY|innertubeApiKey)":"([^"]+)"/,
      /"apiKey":"([^"]+)"/,
      /"key":"([^"]+)"/
    ]) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }

    return null;
  }

  private async callInnerTubeApi(videoId: string, apiKey: string) {
    const url = `https://www.youtube.com/youtubei/v1/get_transcript?key=${encodeURIComponent(apiKey)}`;

    // 构造 protobuf 编码的 params
    // field 1 (string): video ID — tag 0x0a, varint length, then the ID
    const params = encodeTranscriptParams(videoId);

    const response = await fetchWithTimeout(url, {
      method: "POST",
      timeoutMs: 12000,
      service: "YouTube InnerTube API",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20250518.01.00"
          }
        },
        params
      })
    });

    const data = await response.json();
    return this.parseTranscriptResponse(data);
  }

  private parseTranscriptResponse(data: unknown) {
    if (!isRecord(data)) return [];

    const actions = get(data, "actions") ??
      get(get(data, "responseContext"), "actions") ??
      [];

    const segments: TranscriptSegment[] = [];

    for (const action of (Array.isArray(actions) ? actions : [])) {
      if (!isRecord(action)) continue;

      const updatePanel = get(action, "updateEngagementPanelAction");
      const updateTranscript = get(action, "updateTranscriptAction");
      const renderer =
        get(get(updatePanel, "content"), "transcriptSearchPanelRenderer") ??
        get(get(updateTranscript, "content"), "transcriptRenderer");

      if (!isRecord(renderer)) continue;

      const body = get(get(renderer, "body"), "transcriptSearchPanelBodyRenderer") ??
        get(get(renderer, "body"), "transcriptBodyRenderer");
      if (!isRecord(body)) continue;

      const cueGroups = get(body, "cueGroups") ?? [];
      for (const group of (Array.isArray(cueGroups) ? cueGroups : [])) {
        if (!isRecord(group)) continue;

        const cues = get(get(group, "transcriptCueGroupRenderer"), "cues") ?? [];
        for (const cue of (Array.isArray(cues) ? cues : [])) {
          if (!isRecord(cue)) continue;

          const c = get(cue, "transcriptCueRenderer");
          if (!isRecord(c)) continue;

          const startTime = parseFloatSafe(get(c, "startMs") ?? get(c, "startOffsetMs"));
          const endTime = parseFloatSafe(get(c, "endMs") ?? get(c, "endOffsetMs"));
          const snippet = get(c, "snippet") ?? get(c, "cue") ?? get(c, "formattedText");
          const text =
            typeof snippet === "string"
              ? decodeHtml(snippet.replace(/<[^>]*>/g, " ").trim())
              : "";

          if (
            Number.isFinite(startTime) &&
            Number.isFinite(endTime) &&
            text
          ) {
            segments.push(
              TranscriptSegmentSchema.parse({
                startTime: startTime / 1000,
                endTime: endTime / 1000,
                text
              })
            );
          }
        }
      }
    }

    return segments;
  }
}

// 官方转录页面回退（仅有特定视频）
export class OfficialWebTranscriptProvider implements TranscriptProvider {
  private readonly transcriptUrls: Record<string, string> = {
    vif8NQcjVf0: "https://lexfridman.com/jensen-huang-transcript/"
  };

  async getTranscript(videoId: string) {
    const transcriptUrl = this.transcriptUrls[videoId];
    if (!transcriptUrl) {
      throw new Error("此视频没有官方转录映射。");
    }

    const response = await fetchWithTimeout(transcriptUrl, {
      timeoutMs: 15000,
      service: "official transcript"
    });
    const html = await response.text();
    const segments = this.parseLexTranscript(html);

    if (segments.length === 0) {
      throw new Error("官方转录页面未包含有效段落。");
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

// 多层回退链
class FallbackTranscriptProvider implements TranscriptProvider {
  private readonly chain: TranscriptProvider[];

  constructor(...providers: TranscriptProvider[]) {
    this.chain = providers;
  }

  async getTranscript(videoId: string) {
    for (const provider of this.chain) {
      try {
        return await provider.getTranscript(videoId);
      } catch {
        // 当前 provider 失败，尝试下一个
      }
    }
    throw new Error("所有转录提取方式均失败，此视频可能没有正确配置的字幕。");
  }
}

export function getTranscriptProvider(): TranscriptProvider {
  const provider = (process.env.TRANSCRIPT_PROVIDER ?? "youtube").trim();
  if (provider === "youtube") {
    return new FallbackTranscriptProvider(
      new YouTubeCaptionTranscriptProvider(),
      new InnerTubeTranscriptProvider(),
      new OfficialWebTranscriptProvider()
    );
  }

  throw new Error(
    `TRANSCRIPT_PROVIDER "${provider}" is invalid. Set to "youtube".`
  );
}

// 工具函数

function encodeTranscriptParams(videoId: string) {
  // protobuf 编码: field 1 (tag 0x0a) + varint length + string
  const bytes: number[] = [];
  bytes.push(0x0a); // field 1, wire type 2
  bytes.push(videoId.length); // varint（videoId 长度小于 128 所以就是直接值）
  for (let i = 0; i < videoId.length; i++) {
    bytes.push(videoId.charCodeAt(i));
  }
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes: number[]) {
  const binary = String.fromCharCode(...bytes);
  // btoa 在 Worker/node 都可用
  return typeof btoa !== "undefined"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
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

function parseFloatSafe(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return NaN;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// 安全地遍历嵌套对象，TypeScript 友好
function get(obj: unknown, ...path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}
