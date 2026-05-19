import { TranscriptSegmentSchema, type TranscriptSegment } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/utils/http";

export interface TranscriptProvider {
  getTranscript(videoId: string): Promise<TranscriptSegment[]>;
}

// 内部数据结构
interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: string;
  kind?: "asr";
}

// 页面抓取结果 — visitorData 是关键，它让 InnerTube 请求看起来是合法的后续请求
interface PageData {
  apiKey: string;
  visitorData: string;
  clientVersion: string;
}

// === 三层客户端回退 ===
// 关键：Android/iOS 使用硬编码 API key，所有客户端共享页面抓取的 visitorData
// 每个客户端有不同的反爬阈值，多层回退大幅提高成功率

interface ClientIdentity {
  name: string;
  clientName: string;
  clientVersion: string;
  userAgent: string;
  apiKey: string;
}

const CLIENTS: ClientIdentity[] = [
  {
    name: "Android",
    clientName: "ANDROID",
    clientVersion: "20.10.38",
    userAgent:
      "com.google.android.youtube/20.10.38 (Linux; U; Android 14; en_US; Pixel 8 Pro Build/UD1A.231105.004) gzip",
    apiKey: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w"
  },
  {
    name: "Web",
    clientName: "WEB",
    clientVersion: "2.20250326.00.00",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    apiKey: ""
  },
  {
    name: "iOS",
    clientName: "IOS",
    clientVersion: "20.10.4",
    userAgent:
      "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X)",
    apiKey: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc"
  }
];

// 已知的 Web API key（有些视频页面可能不含 key）
const FALLBACK_WEB_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

export class YouTubeTranscriptProvider implements TranscriptProvider {
  async getTranscript(videoId: string) {
    // 第1步：抓取页面HTML — YouTube 不会封页面加载（否则真实用户也看不了）
    const html = await this.fetchPageHtml(videoId);

    // 第2步：从页面嵌入的 ytInitialPlayerResponse 提取字幕（与 InnerTube 返回结构相同）
    // 这是核心策略 — 数据直接在 HTML 里，不需要额外调 API，绑过 IP 检测
    const embeddedTracks = this.extractCaptionTracksFromHtml(html);
    if (embeddedTracks.length > 0) {
      const track = this.selectTrack(embeddedTracks);
      if (track) {
        try {
          const xml = await this.downloadCaptionXml(track.baseUrl);
          const segments = this.parseCaptionXml(xml);
          if (segments.length > 0) {
            return segments;
          }
        } catch {
          // 下载/解析失败，尝试下一个轨道
          for (const fallbackTrack of embeddedTracks.slice(1)) {
            try {
              const xml = await this.downloadCaptionXml(fallbackTrack.baseUrl);
              const segments = this.parseCaptionXml(xml);
              if (segments.length > 0) return segments;
            } catch {
              // 继续尝试
            }
          }
        }
      }
    }

    // 第3步：页面内嵌数据没有字幕，尝试 InnerTube API 回退
    const pageData = this.extractPageCredentials(html);
    return await this.tryInnerTubeClients(videoId, pageData);
  }

  // 抓取 YouTube 页面 HTML，处理 EU consent
  private async fetchPageHtml(videoId: string): Promise<string> {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    let response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeoutMs: 12000,
      service: "YouTube watch page"
    });

    let html = await response.text();

    // 检测 EU 同意页面并绕过
    if (html.includes('action="https://consent.youtube.com/s"')) {
      const consentMatch = html.match(/name="v" value="([^"]*)"/);
      if (consentMatch?.[1]) {
        response = await fetchWithTimeout(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            Cookie: `CONSENT=YES+${consentMatch[1]}`
          },
          timeoutMs: 12000,
          service: "YouTube watch page (consented)"
        });
        html = await response.text();
      }
    }

    // 检查年龄限制（终端错误）
    if (html.includes("Sign in to confirm your age")) {
      throw new TranscriptError("AGE_RESTRICTED", "此视频需要年龄验证。");
    }

    return html;
  }

  // 从页面 HTML 提取 ytInitialPlayerResponse 中的字幕轨道
  private extractCaptionTracksFromHtml(html: string): CaptionTrack[] {
    try {
      const playerResponse = this.extractYtInitialPlayerResponse(html);
      if (!playerResponse) return [];

      const tracks = get(
        playerResponse,
        "captions",
        "playerCaptionsTracklistRenderer",
        "captionTracks"
      );

      if (!Array.isArray(tracks) || tracks.length === 0) return [];

      return tracks.map((track: unknown) => ({
        baseUrl: String(get(track, "baseUrl") ?? ""),
        languageCode: String(get(track, "languageCode") ?? ""),
        name: String(
          get(track, "name", "simpleText") ??
            get(track, "name", "runs", 0, "text") ??
            ""
        ),
        kind: get(track, "kind") === "asr" ? ("asr" as const) : undefined
      }));
    } catch {
      return [];
    }
  }

  // 从页面 HTML 提取 ytInitialPlayerResponse JSON 对象
  // YouTube 将其嵌入为 JavaScript 变量，格式：var ytInitialPlayerResponse = {...};
  private extractYtInitialPlayerResponse(html: string): unknown {
    // 查找变量声明位置
    const patterns = [
      /var\s+ytInitialPlayerResponse\s*=\s*/,
      /ytInitialPlayerResponse\s*=\s*/,
      /window\["ytInitialPlayerResponse"\]\s*=\s*/
    ];

    let startIndex = -1;
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match) {
        startIndex = match.index + match[0].length;
        break;
      }
    }

    if (startIndex === -1) return null;

    // 大括号计数法提取完整 JSON（处理嵌套和多行）
    const slice = html.slice(startIndex);
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let jsonEnd = -1;

    for (let i = 0; i < slice.length; i++) {
      const char = slice[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }

    if (jsonEnd === -1) return null;

    try {
      return JSON.parse(slice.slice(0, jsonEnd)) as unknown;
    } catch {
      return null;
    }
  }

  // 从页面 HTML 提取 InnerTube 凭证
  private extractPageCredentials(html: string): PageData {
    const keyMatch = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
    const visitorMatch = html.match(/"VISITOR_DATA"\s*:\s*"([^"]+)"/);
    const versionMatch = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/);

    return {
      apiKey: keyMatch?.[1] ?? FALLBACK_WEB_API_KEY,
      visitorData: visitorMatch?.[1] ?? "",
      clientVersion: versionMatch?.[1] ?? "2.20250326.00.00"
    };
  }

  // InnerTube API 回退：当页面内嵌数据没有字幕时尝试
  private async tryInnerTubeClients(
    videoId: string,
    pageData: PageData
  ) {
    let lastError: Error | null = null;

    for (const client of CLIENTS) {
      if (client.clientName === "WEB" && !pageData.apiKey) continue;

      try {
        const apiKey = client.apiKey || pageData.apiKey;
        if (!apiKey) continue;

        const tracks = await this.fetchInnerTubeTracks(videoId, apiKey, client, pageData.visitorData);
        const track = this.selectTrack(tracks);
        if (!track) continue;

        const xml = await this.downloadCaptionXml(track.baseUrl);
        const segments = this.parseCaptionXml(xml);
        if (segments.length > 0) return segments;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (!shouldRetry(error)) throw error;
      }
    }

    throw lastError ?? new Error("所有 YouTube 提取方式均失败，此视频可能没有可用的字幕。");
  }

  // 调用 InnerTube Player API
  private async fetchInnerTubeTracks(
    videoId: string,
    apiKey: string,
    client: ClientIdentity,
    visitorData: string
  ) {
    const body: Record<string, unknown> = {
      videoId,
      context: {
        client: {
          clientName: client.clientName,
          clientVersion: client.clientVersion,
          userAgent: client.userAgent,
          hl: "en",
          gl: "US",
          ...(visitorData ? { visitorData } : {})
        }
      }
    };

    if (client.clientName !== "WEB") {
      body.contentCheckOk = true;
      body.racyCheckOk = true;
    }

    const response = await fetchWithTimeout(
      `https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        timeoutMs: 15000,
        service: `YouTube InnerTube (${client.name})`,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": client.userAgent,
          "Accept-Language": "en-US,en;q=0.9"
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    const tracks = get(
      data,
      "captions",
      "playerCaptionsTracklistRenderer",
      "captionTracks"
    );

    if (Array.isArray(tracks) && tracks.length > 0) {
      return tracks.map((track: unknown) => ({
        baseUrl: String(get(track, "baseUrl") ?? ""),
        languageCode: String(get(track, "languageCode") ?? ""),
        name: String(
          get(track, "name", "simpleText") ??
            get(track, "name", "runs", 0, "text") ??
            ""
        ),
        kind: get(track, "kind") === "asr" ? ("asr" as const) : undefined
      }));
    }

    // 没有字幕时检查错误
    if (isRecord(data)) {
      if (data.error || data.errorMessage) {
        throw new TranscriptError("INNERTUBE_REJECTED", "YouTube API 拒绝请求。");
      }
      const status = get(data, "playabilityStatus", "status");
      if (status === "ERROR" || status === "LOGIN_REQUIRED") {
        throw new TranscriptError("VIDEO_UNAVAILABLE", "视频播放受限且无字幕数据。");
      }
    }

    return [];
  }

  // 选择最佳字幕轨道：优先手动英语 → 自动英语 → 任何英语 → 任何
  private selectTrack(tracks: CaptionTrack[]) {
    if (tracks.length === 0) return null;

    const isEnglish = (t: CaptionTrack) => t.languageCode?.startsWith("en");

    const manualEnglish = tracks.find((t) => t.kind !== "asr" && isEnglish(t));
    if (manualEnglish) return manualEnglish;

    const autoEnglish = tracks.find((t) => isEnglish(t));
    if (autoEnglish) return autoEnglish;

    const manualAny = tracks.find((t) => t.kind !== "asr");
    if (manualAny) return manualAny;

    return tracks[0];
  }

  // 下载字幕 XML
  private async downloadCaptionXml(baseUrl: string) {
    const url = baseUrl.includes("?") ? `${baseUrl}&fmt=3` : `${baseUrl}?fmt=3`;

    const response = await fetchWithTimeout(url, {
      timeoutMs: 10000,
      service: "YouTube caption download"
    });

    return response.text();
  }

  // 解析字幕 XML — 兼容两种格式
  private parseCaptionXml(xml: string) {
    const segments: TranscriptSegment[] = [];

    // 格式1：<p t="毫秒" d="毫秒">文本</p>
    for (const match of xml.matchAll(
      /<p\s+t="([^"]*)"(?:\s+d="([^"]*)")?[^>]*>([\s\S]*?)<\/p>/g
    )) {
      const startTime = Number(match[1]) / 1000;
      const duration = Number(match[2]) / 1000;
      const text = cleanCaptionText(match[3]);
      if (Number.isFinite(startTime) && Number.isFinite(duration) && text) {
        segments.push(
          TranscriptSegmentSchema.parse({ startTime, endTime: startTime + duration, text })
        );
      }
    }

    if (segments.length > 0) return segments;

    // 格式2：<text start="秒" dur="秒">文本</text>
    for (const match of xml.matchAll(
      /<text\s+start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g
    )) {
      const startTime = Number(match[1]);
      const duration = Number(match[2]);
      const text = cleanCaptionText(match[3]);
      if (Number.isFinite(startTime) && Number.isFinite(duration) && text) {
        segments.push(
          TranscriptSegmentSchema.parse({ startTime, endTime: startTime + duration, text })
        );
      }
    }

    return segments;
  }
}

// 第三方 API 回退（Supadata / youtubetranscript.com）
export class ExternalApiTranscriptProvider implements TranscriptProvider {
  async getTranscript(videoId: string) {
    // 尝试 Supadata（如果配置了 API key）
    const supadataKey = process.env.SUPADATA_API_KEY;
    if (supadataKey) {
      try {
        return await this.fetchFromSupadata(videoId, supadataKey);
      } catch {
        // 继续下一个
      }
    }

    throw new Error("外部转录 API 也未返回结果。");
  }

  private async fetchFromSupadata(videoId: string, apiKey: string) {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const response = await fetchWithTimeout(
      `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&lang=en`,
      {
        timeoutMs: 15000,
        service: "Supadata",
        headers: {
          "x-api-key": apiKey
        }
      }
    );

    const data: unknown = await response.json();
    const segments = this.parseSupadataResponse(data);

    if (segments.length === 0) {
      throw new Error("Supadata 未返回字幕。");
    }

    return segments;
  }

  private parseSupadataResponse(data: unknown) {
    // Supadata 有多种响应格式
    const content = isRecord(data)
      ? (get(data, "body", "content") ?? get(data, "body", "transcript") ?? data)
      : data;

    if (!Array.isArray(content)) return [];

    const segments: TranscriptSegment[] = [];

    // 检测时间戳单位（采样前5个）
    const samples = content.slice(0, 5);
    let isMs = false;
    if (samples.length > 0) {
      const avg =
        samples.reduce((sum: number, s) => {
          const offset = isRecord(s)
            ? Number(s.offset ?? s.start)
            : 0;
          return sum + (Number.isFinite(offset) ? offset : 0);
        }, 0) / samples.length;
      isMs = avg > 500;
    }

    for (const item of content) {
      if (!isRecord(item)) continue;

      const rawStart = get(item, "offset") ?? get(item, "start") ?? 0;
      const startTime = Number(rawStart) / (isMs ? 1000 : 1);
      const endTime = startTime + 5; // Supadata 不总是提供 duration

      const text =
        typeof item.text === "string"
          ? decodeHtml(item.text.replace(/<[^>]*>/g, " ").trim())
          : "";

      if (Number.isFinite(startTime) && text) {
        segments.push(
          TranscriptSegmentSchema.parse({ startTime, endTime, text })
        );
      }
    }

    return segments;
  }
}

// 官方转录页面（特定视频硬编码回退）
export class OfficialWebTranscriptProvider implements TranscriptProvider {
  private readonly transcriptUrls: Record<string, string> = {};

  async getTranscript(videoId: string): Promise<TranscriptSegment[]> {
    const url = this.transcriptUrls[videoId];
    if (!url) throw new Error("此视频没有官方转录映射。");

    throw new Error("官方转录回退已移除。");
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
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(msg);
      }
    }
    throw new Error(
      `所有转录提取方式均失败（${errors.length}层）：${errors.join(" | ")}`
    );
  }
}

export function getTranscriptProvider(): TranscriptProvider {
  const provider = (process.env.TRANSCRIPT_PROVIDER ?? "youtube").trim();
  if (provider === "youtube") {
    return new FallbackTranscriptProvider(
      new YouTubeTranscriptProvider(),
      new ExternalApiTranscriptProvider()
    );
  }

  throw new Error(
    `TRANSCRIPT_PROVIDER "${provider}" is invalid. Set to "youtube".`
  );
}

// === 错误类型 ===
type ErrorCode =
  | "AGE_RESTRICTED"
  | "VIDEO_UNAVAILABLE"
  | "NO_TRANSCRIPT"
  | "INNERTUBE_REJECTED"
  | "UNKNOWN";

class TranscriptError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = "TranscriptError";
  }
}

function shouldRetry(error: unknown) {
  if (error instanceof TranscriptError) {
    // 终端错误不重试
    const terminal: ErrorCode[] = [
      "AGE_RESTRICTED",
      "VIDEO_UNAVAILABLE",
      "NO_TRANSCRIPT"
    ];
    return !terminal.includes(error.code);
  }
  // 网络错误等可以重试
  return true;
}

// === 工具函数 ===

function cleanCaptionText(raw: string) {
  return decodeHtml(
    raw
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
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
    .replace(/&#x?([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function get(obj: unknown, ...path: (string | number)[]): unknown {
  let current = obj;
  for (const key of path) {
    if (typeof key === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[key];
    } else {
      if (!isRecord(current)) return undefined;
      current = current[key];
    }
  }
  return current;
}
