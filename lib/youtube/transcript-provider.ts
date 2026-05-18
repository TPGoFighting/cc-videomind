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

// 绕过 YouTube EU 同意页面的 cookie
const CONSENT_COOKIE = "CONSENT=YES+cb; Path=/; Domain=.youtube.com";

// YouTubeCaptionTranscriptProvider：从 HTML 中提取字幕轨道
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

  // 公开引用，InnerTube provider 也用它
  async fetchWatchHtml(videoId: string) {
    const response = await fetchWithTimeout(buildYouTubeWatchUrl(videoId), {
      headers: buildYouTubeHeaders(),
      timeoutMs: 15000,
      service: "YouTube watch page"
    });

    return response.text();
  }

  private extractCaptionTracks(html: string) {
    // 先检查是否包含 captionTracks 或 ytInitialPlayerResponse
    if (
      !html.includes("captionTracks") &&
      !html.includes("ytInitialPlayerResponse")
    ) {
      // 页面可能不是正常的视频页（例如被重定向、同意页等）
      return [];
    }

    let tracks = this.extractFromPlayerResponse(html);
    if (tracks.length > 0) return tracks;

    tracks = this.extractWithRegex(html);
    if (tracks.length > 0) return tracks;

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
      // 继续下一个方法
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
      // 继续
    }

    return [];
  }

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
        if (char === "{") depth++;
        else if (char === "}") {
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

// InnerTube API 回退 — 使用 YouTube 内部 API
export class InnerTubeTranscriptProvider implements TranscriptProvider {
  constructor(
    private readonly htmlProvider = new YouTubeCaptionTranscriptProvider()
  ) {}

  async getTranscript(videoId: string) {
    const html = await this.htmlProvider.fetchWatchHtml(videoId);
    const apiKey = this.extractApiKey(html);

    if (!apiKey) {
      // 尝试直接使用已知的 Web API key（YouTube web client 使用）
      throw new Error("无法获取 InnerTube API 密钥。");
    }

    const segments = await this.callInnerTubeApi(videoId, apiKey);
    if (segments.length === 0) {
      throw new Error("InnerTube API 未返回字幕。");
    }

    return segments;
  }

  private extractApiKey(html: string) {
    for (const pattern of [
      /"(?:INNERTUBE_API_KEY|innertubeApiKey)":"([^"]+)"/,
      /"apiKey":"([^"]+)"/,
      /"key":"(AIza[^"]+)"/,
      /INNERTUBE_API_KEY\s*:\s*"([^"]+)"/,
      /innertubeApiKey\s*:\s*"([^"]+)"/
    ]) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private async callInnerTubeApi(videoId: string, apiKey: string) {
    const url = `https://www.youtube.com/youtubei/v1/get_transcript?key=${encodeURIComponent(apiKey)}`;
    const params = encodeTranscriptParams(videoId);

    const response = await fetchWithTimeout(url, {
      method: "POST",
      timeoutMs: 15000,
      service: "YouTube InnerTube API",
      headers: {
        "Content-Type": "application/json",
        ...buildYouTubeHeaders()
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20250518.01.00",
            hl: "en"
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

    // 先检查错误
    if (data.error || data.errorMessage) {
      return [];
    }

    const actions =
      get(data, "actions") ??
      get(get(data, "responseContext"), "actions") ??
      [];
    const segments: TranscriptSegment[] = [];

    for (const action of Array.isArray(actions) ? actions : []) {
      if (!isRecord(action)) continue;

      const updatePanel = get(action, "updateEngagementPanelAction");
      const updateTranscript = get(action, "updateTranscriptAction");
      const renderer =
        get(
          get(updatePanel, "content"),
          "transcriptSearchPanelRenderer"
        ) ??
        get(get(updateTranscript, "content"), "transcriptRenderer");

      if (!isRecord(renderer)) continue;

      const body =
        get(get(renderer, "body"), "transcriptSearchPanelBodyRenderer") ??
        get(get(renderer, "body"), "transcriptBodyRenderer");
      if (!isRecord(body)) continue;

      const cueGroups = get(body, "cueGroups") ?? [];
      for (const group of Array.isArray(cueGroups) ? cueGroups : []) {
        if (!isRecord(group)) continue;

        const cues =
          get(get(group, "transcriptCueGroupRenderer"), "cues") ?? [];
        for (const cue of Array.isArray(cues) ? cues : []) {
          if (!isRecord(cue)) continue;

          const c = get(cue, "transcriptCueRenderer");
          if (!isRecord(c)) continue;

          const startTime = parseFloatSafe(
            get(c, "startMs") ?? get(c, "startOffsetMs")
          );
          const endTime = parseFloatSafe(
            get(c, "endMs") ?? get(c, "endOffsetMs")
          );
          const snippet =
            get(c, "snippet") ?? get(c, "cue") ?? get(c, "formattedText");
          const text =
            typeof snippet === "string"
              ? decodeHtml(snippet.replace(/<[^>]*>/g, " ").trim())
              : "";

          if (Number.isFinite(startTime) && Number.isFinite(endTime) && text) {
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

// youtubetranscript.com API 回退 — 第三方转录服务
export class YouTubeTranscriptComProvider implements TranscriptProvider {
  async getTranscript(videoId: string) {
    const url = `https://youtubetranscript.com/?v=${encodeURIComponent(videoId)}`;

    const response = await fetchWithTimeout(url, {
      timeoutMs: 15000,
      service: "youtubetranscript.com",
      headers: buildYouTubeHeaders()
    });

    const data: unknown = await response.json();
    const segments = this.parseApiResponse(data);
    if (segments.length === 0) {
      throw new Error("youtubetranscript.com 未返回可用字幕。");
    }

    return segments;
  }

  private parseApiResponse(data: unknown) {
    if (!Array.isArray(data)) return [];

    const segments: TranscriptSegment[] = [];
    for (const item of data) {
      if (!isRecord(item)) continue;

      const startTime = parseFloatSafe(get(item, "start") ?? get(item, "offset"));
      const duration = parseFloatSafe(get(item, "dur") ?? get(item, "duration"));
      const text =
        typeof item.text === "string" && item.text.trim()
          ? decodeHtml(item.text.trim())
          : "";

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

// 官方转录页面（特定视频）
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
        endTime: Number.isFinite(nextStartTime) ? nextStartTime : startTime + 60,
        text
      });
    });
  }
}

// 多层回退
class FallbackTranscriptProvider implements TranscriptProvider {
  private readonly chain: TranscriptProvider[];

  constructor(...providers: TranscriptProvider[]) {
    this.chain = providers;
  }

  async getTranscript(videoId: string) {
    const errors: string[] = [];
    for (const provider of this.chain) {
      try {
        return await provider.getTranscript(videoId);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        errors.push(msg);
        console.error(
          `[${provider.constructor.name}] 转录获取失败:`,
          msg
        );
      }
    }
    console.error(`[Transcript] 全部 ${this.chain.length} 个提取方式均失败:`, errors.join(" | "));
    throw new Error("所有转录提取方式均失败，此视频可能没有正确配置的字幕。");
  }
}

export function getTranscriptProvider(): TranscriptProvider {
  const provider = (process.env.TRANSCRIPT_PROVIDER ?? "youtube").trim();
  if (provider === "youtube") {
    return new FallbackTranscriptProvider(
      new YouTubeCaptionTranscriptProvider(),
      new InnerTubeTranscriptProvider(),
      new YouTubeTranscriptComProvider(),
      new OfficialWebTranscriptProvider()
    );
  }

  throw new Error(
    `TRANSCRIPT_PROVIDER "${provider}" is invalid. Set to "youtube".`
  );
}

// === 工具函数 ===

function buildYouTubeHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: CONSENT_COOKIE
  };
}

function encodeTranscriptParams(videoId: string) {
  const bytes: number[] = [];
  bytes.push(0x0a); // field 1, wire type 2
  bytes.push(videoId.length);
  for (let i = 0; i < videoId.length; i++) {
    bytes.push(videoId.charCodeAt(i));
  }
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes: number[]) {
  const binary = String.fromCharCode(...bytes);
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

function get(obj: unknown, ...path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}
