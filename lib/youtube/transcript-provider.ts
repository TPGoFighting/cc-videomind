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
  private pageDataCache: PageData | null = null;

  async getTranscript(videoId: string) {
    // 第1步：抓取页面获取 visitorData（只抓一次，所有客户端共享）
    // visitorData 是关键 — 它让 InnerTube 请求看起来是合法页面加载的后续请求
    let pageData: PageData | null = null;
    try {
      pageData = await this.scrapeWatchPage(videoId);
    } catch (err) {
      // 页面抓取失败不致命，Android/iOS 有硬编码 key 仍可尝试
      if (err instanceof TranscriptError && !shouldRetry(err)) {
        throw err; // 终端错误（视频不可用/年龄限制）直接抛出
      }
    }

    // 第2步：逐层尝试 Android → Web → iOS
    let lastError: Error | null = null;
    for (const client of CLIENTS) {
      // Web 客户端必须有抓取到的 API key
      if (client.clientName === "WEB" && !pageData?.apiKey) {
        continue;
      }

      try {
        const result = await this.tryWithClient(videoId, client, pageData);
        if (result.length > 0) {
          return result;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (!shouldRetry(error)) {
          throw error;
        }
      }
    }

    throw lastError ?? new Error("所有 YouTube 客户端提取方式均失败，此视频可能没有可用的字幕。");
  }

  private async tryWithClient(
    videoId: string,
    client: ClientIdentity,
    pageData: PageData | null
  ) {
    // 优先使用客户端硬编码 key，回退到页面抓取的 key
    const apiKey = client.apiKey || pageData?.apiKey;
    if (!apiKey) {
      throw new TranscriptError("INNERTUBE_REJECTED", `${client.name} 客户端缺少 API key`);
    }

    const tracks = await this.fetchCaptionTracks(videoId, apiKey, client, pageData?.visitorData);
    const track = this.selectTrack(tracks);

    if (!track) {
      throw new TranscriptError("NO_TRANSCRIPT", "此视频没有字幕轨道。");
    }

    const xml = await this.downloadCaptionXml(track.baseUrl);
    const segments = this.parseCaptionXml(xml);

    if (segments.length === 0) {
      throw new TranscriptError("NO_TRANSCRIPT", "字幕内容为空。");
    }

    return segments;
  }

  // 抓取页面获取 API key、visitorData 和 client version
  private async scrapeWatchPage(videoId: string): Promise<PageData> {
    // 如果已缓存，直接返回
    if (this.pageDataCache) {
      return this.pageDataCache;
    }

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
      const consentMatch = html.match(
        /name="v" value="([^"]*)"/
      );
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

    // 检查视频可用性（页面级别，还没调 InnerTube）
    if (html.includes('"playabilityStatus":{"status":"ERROR"')) {
      if (html.includes("Sign in to confirm your age")) {
        throw new TranscriptError("AGE_RESTRICTED", "此视频需要年龄验证。");
      }
      // 不在此处抛 VIDEO_UNAVAILABLE，因为可能是数据中心 IP 导致的，
      // InnerTube API 可能仍能返回字幕数据
    }

    // 提取三个关键字段
    const keyMatch = html.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/);
    const visitorMatch = html.match(/"VISITOR_DATA"\s*:\s*"([^"]+)"/);
    const versionMatch = html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/);

    const pageData: PageData = {
      apiKey: keyMatch?.[1] ?? FALLBACK_WEB_API_KEY,
      visitorData: visitorMatch?.[1] ?? "",
      clientVersion: versionMatch?.[1] ?? "2.20250326.00.00"
    };

    this.pageDataCache = pageData;
    return pageData;
  }

  // 调用 InnerTube Player API 获取字幕轨道列表
  private async fetchCaptionTracks(
    videoId: string,
    apiKey: string,
    client: ClientIdentity,
    visitorData?: string
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
          // visitorData 是关键：让请求看起来是先加载了页面再调 API 的合法用户
          ...(visitorData ? { visitorData } : {})
        }
      }
    };

    // Android/iOS 需要这些额外标志
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

    // 先提取字幕 — 即使视频受限，字幕数据通常仍在响应中
    const tracks = get(
      data,
      "captions",
      "playerCaptionsTracklistRenderer",
      "captionTracks"
    );

    if (Array.isArray(tracks) && tracks.length > 0) {
      return tracks.map((track) => ({
        baseUrl: String(get(track, "baseUrl") ?? ""),
        languageCode: String(get(track, "languageCode") ?? ""),
        name:
          String(get(track, "name", "simpleText") ?? get(track, "name", "runs", 0, "text") ?? ""),
        kind: get(track, "kind") === "asr" ? ("asr" as const) : undefined
      }));
    }

    // 没有字幕时才检查错误原因
    if (isRecord(data)) {
      if (data.error || data.errorMessage) {
        throw new TranscriptError(
          "INNERTUBE_REJECTED",
          "YouTube API 拒绝请求，正在尝试其他方式。"
        );
      }

      const status = get(data, "playabilityStatus", "status");
      if (status === "ERROR" || status === "LOGIN_REQUIRED") {
        throw new TranscriptError(
          "VIDEO_UNAVAILABLE",
          "视频播放受限且无字幕数据。"
        );
      }
    }

    return [];
  }

  // 选择最佳字幕轨道：优先手动英语 → 自动英语 → 任何英语 → 任何
  private selectTrack(tracks: CaptionTrack[]) {
    if (tracks.length === 0) return null;

    const isEnglish = (t: CaptionTrack) =>
      t.languageCode?.startsWith("en");

    // 1. 手动英文字幕
    const manualEnglish = tracks.find(
      (t) => t.kind !== "asr" && isEnglish(t)
    );
    if (manualEnglish) return manualEnglish;

    // 2. 自动生成英文字幕
    const autoEnglish = tracks.find((t) => isEnglish(t));
    if (autoEnglish) return autoEnglish;

    // 3. 任意手动字幕
    const manualAny = tracks.find((t) => t.kind !== "asr");
    if (manualAny) return manualAny;

    // 4. 第一个可用
    return tracks[0];
  }

  // 下载字幕 XML
  private async downloadCaptionXml(baseUrl: string) {
    const url = baseUrl.includes("?")
      ? `${baseUrl}&fmt=3`
      : `${baseUrl}?fmt=3`;

    const response = await fetchWithTimeout(url, {
      timeoutMs: 10000,
      service: "YouTube caption download"
    });

    return response.text();
  }

  // 解析字幕 XML — 兼容两种格式
  private parseCaptionXml(xml: string) {
    const segments: TranscriptSegment[] = [];

    // 格式1：新格式 <p t="毫秒" d="毫秒">文本</p>
    const newFormat = xml.matchAll(
      /<p\s+t="([^"]*)"(?:\s+d="([^"]*)")?[^>]*>([\s\S]*?)<\/p>/g
    );

    for (const match of newFormat) {
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

    // 格式2：旧格式 <text start="秒" dur="秒">文本</text>
    const oldFormat = xml.matchAll(
      /<text\s+start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g
    );

    for (const match of oldFormat) {
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
