import { type TranscriptSegment } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/utils/http";
import { YoutubeTranscriptPackageProvider } from "@/lib/youtube/youtube-transcript-pkg-provider";

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

export interface TranscriptProvider {
  getTranscript(videoId: string, preferredLang?: string): Promise<TranscriptSegment[]>;
}

/** 内部使用的字幕片段（解析后的中间格式） */
export interface RawSegment {
  start: number;
  duration: number;
  text: string;
}

/** 字幕轨道元数据 */
export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: string;
  kind?: "asr";
  isTranslatable?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 错误体系
// ═══════════════════════════════════════════════════════════════════════════════

export type TranscriptErrorCode =
  | "PAGE_FETCH_FAILED"       // 无法获取 YouTube 页面（网络/超时）
  | "CONSENT_REQUIRED"        // EU 同意页面，已尝试绕过但失败
  | "AGE_RESTRICTED"          // 需要年龄验证
  | "NO_PLAYER_RESPONSE"      // 页面中没有 ytInitialPlayerResponse
  | "NO_CAPTION_TRACKS"       // 有 playerResponse 但没有字幕轨道
  | "CAPTION_DOWNLOAD_FAILED" // 所有字幕轨道下载均失败
  | "ALL_TRACKS_FAILED";      // 所有轨道尝试均失败（下载成功但解析失败）

export class TranscriptError extends Error {
  public readonly code: TranscriptErrorCode;

  constructor(code: TranscriptErrorCode, message: string) {
    super(message);
    this.name = "TranscriptError";
    this.code = code;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// InnertubeTranscriptProvider — InnerTube API 最快方式
// ═══════════════════════════════════════════════════════════════════════════════

const INNERTUBE_CLIENTS = [
  { name: "ANDROID", hl: "en", gl: "US", clientName: "ANDROID", clientVersion: "19.44.39", userAgent: "com.google.android.youtube/19.44.39 (Linux; U; Android 14) gzip" },
  { name: "WEB", hl: "en", gl: "US", clientName: "WEB", clientVersion: "2.20250501.00.00", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36" },
  { name: "IOS", hl: "en", gl: "US", clientName: "IOS", clientVersion: "19.44.4", userAgent: "com.google.ios.youtube/19.44.4 (iPhone16,2; U; CPU iOS 18_0 like Mac OS X)" },
] as const;

export class InnertubeTranscriptProvider implements TranscriptProvider {
  async getTranscript(videoId: string, preferredLang?: string): Promise<TranscriptSegment[]> {
    const apiKey = await this.getApiKey();
    if (!apiKey) throw new TranscriptError("PAGE_FETCH_FAILED", "无法获取 YouTube API key");

    // 多客户端重试：Android → Web → iOS
    const clientErrors: string[] = [];
    for (const client of INNERTUBE_CLIENTS) {
      try {
        const result = await this.tryWithClient(videoId, apiKey, client, preferredLang);
        if (result.length > 0) return result;
        clientErrors.push(`${client.name}: 字幕内容为空`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        clientErrors.push(`${client.name}: ${msg}`);
      }
    }
    throw new TranscriptError("ALL_TRACKS_FAILED", `所有客户端均失败（${INNERTUBE_CLIENTS.length}个）：${clientErrors.join(" | ")}`);
  }

  private async tryWithClient(videoId: string, apiKey: string, client: typeof INNERTUBE_CLIENTS[number], preferredLang?: string): Promise<TranscriptSegment[]> {
    const playerResponse = await this.fetchPlayerResponse(videoId, apiKey, client);

    const tracks = new YouTubeTranscriptProvider().extractCaptionTracksPublic(playerResponse);
    if (tracks.length === 0) throw new TranscriptError("NO_CAPTION_TRACKS", "此视频没有任何字幕轨道。");

    const ranked = new YouTubeTranscriptProvider().rankTracksPublic(tracks, preferredLang);

    const errors: string[] = [];
    for (const track of ranked) {
      try {
        const segments = await this.downloadAndParse(track);
        if (segments.length > 0) return segments;
        errors.push(`${track.languageCode}: 字幕内容为空`);
      } catch (err) {
        errors.push(`${track.languageCode}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    throw new TranscriptError("ALL_TRACKS_FAILED", `所有字幕轨道均失败（${ranked.length}个轨道）：${errors.join(" | ")}`);
  }

  private async getApiKey(): Promise<string | null> {
    // 从 YouTube 首页提取 API key（缓存在内存中）
    if (InnertubeTranscriptProvider._cachedApiKey) return InnertubeTranscriptProvider._cachedApiKey;
    try {
      const res = await fetchWithTimeout("https://www.youtube.com", {
        timeoutMs: 8000, service: "YouTube homepage",
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9" }
      });
      const html = await res.text();
      const match = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      if (match?.[1]) InnertubeTranscriptProvider._cachedApiKey = match[1];
      return InnertubeTranscriptProvider._cachedApiKey;
    } catch { return null; }
  }

  private async fetchPlayerResponse(videoId: string, apiKey: string, client: typeof INNERTUBE_CLIENTS[number]): Promise<unknown> {
    const body = {
      context: { client: { hl: client.hl, gl: client.gl, clientName: client.clientName, clientVersion: client.clientVersion } },
      videoId,
    };
    const res = await fetchWithTimeout(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
      method: "POST", body: JSON.stringify(body),
      timeoutMs: 12000, service: `YouTube InnerTube (${client.name})`,
      headers: { "Content-Type": "application/json", "User-Agent": client.userAgent }
    });
    const data = await res.json();
    if (data?.playabilityStatus?.status === "AGE_CHECK_REQUIRED") {
      throw new TranscriptError("AGE_RESTRICTED", "此视频需要年龄验证。");
    }
    return data;
  }

  private async downloadAndParse(track: CaptionTrack): Promise<TranscriptSegment[]> {
    const url = track.baseUrl.includes("?") ? `${track.baseUrl}&fmt=3` : `${track.baseUrl}?fmt=3`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 10000, service: "YouTube caption download",
      headers: { "User-Agent": USER_AGENT }
    });
    const content = await res.text();
    const rawSegments = parseCaptionContent(content);
    const segments = rawSegments
      .filter(s => s.text.length > 0 && Number.isFinite(s.start) && Number.isFinite(s.duration))
      .map(s => ({ startTime: s.start, endTime: s.start + s.duration, text: s.text }));
    return mergeIntoSentences(segments);
  }

  private static _cachedApiKey: string | null = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// YouTubeTranscriptProvider — HTML-first 策略
// ═══════════════════════════════════════════════════════════════════════════════

const YOUTUBE_WATCH_URL = "https://www.youtube.com/watch";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

export class YouTubeTranscriptProvider implements TranscriptProvider {
  async getTranscript(
    videoId: string,
    preferredLang?: string
  ): Promise<TranscriptSegment[]> {
    // 第1步：获取页面 HTML
    const html = await this.fetchPageHtml(videoId);

    // 第2步：提取 ytInitialPlayerResponse
    const playerResponse = this.extractPlayerResponse(html);
    if (!playerResponse) {
      throw new TranscriptError(
        "NO_PLAYER_RESPONSE",
        "无法从页面中提取播放器数据，视频可能不可用。"
      );
    }

    // 第3步：提取字幕轨道列表
    const tracks = this.extractCaptionTracks(playerResponse);
    if (tracks.length === 0) {
      throw new TranscriptError(
        "NO_CAPTION_TRACKS",
        "此视频没有任何字幕轨道。"
      );
    }

    // 第4步：选择轨道并按优先级排列（首选排最前）
    const ranked = this.rankTracks(tracks, preferredLang);

    // 第5步：逐个尝试轨道，下载+解析
    const errors: string[] = [];
    for (const track of ranked) {
      try {
        const segments = await this.downloadAndParse(track);
        if (segments.length > 0) {
          return segments;
        }
        errors.push(`${track.languageCode}: 字幕内容为空`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${track.languageCode}: ${msg}`);
      }
    }

    throw new TranscriptError(
      "ALL_TRACKS_FAILED",
      `所有字幕轨道均失败（${ranked.length}个轨道）：${errors.join(" | ")}`
    );
  }

  // ─── 第1步：获取页面 HTML ──────────────────────────────────────────────

  private async fetchPageHtml(videoId: string): Promise<string> {
    const url = `${YOUTUBE_WATCH_URL}?v=${encodeURIComponent(videoId)}`;
    let response: Response;

    try {
      response = await fetchWithTimeout(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "en-US,en;q=0.9"
        },
        timeoutMs: 12000,
        service: "YouTube watch page"
      });
    } catch {
      throw new TranscriptError(
        "PAGE_FETCH_FAILED",
        "无法获取 YouTube 页面，请检查网络连接。"
      );
    }

    let html = await response.text();

    // 处理 EU 同意页面 — 提取 token，设置 CONSENT cookie 后重新请求
    if (html.includes('action="https://consent.youtube.com/s"')) {
      const consentMatch = html.match(/name="v" value="([^"]*)"/);
      if (!consentMatch?.[1]) {
        throw new TranscriptError(
          "CONSENT_REQUIRED",
          "需要同意 Cookie 但无法提取同意令牌。"
        );
      }

      try {
        response = await fetchWithTimeout(url, {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
            Cookie: `CONSENT=YES+${consentMatch[1]}`
          },
          timeoutMs: 12000,
          service: "YouTube watch page (consented)"
        });
        html = await response.text();
      } catch {
        throw new TranscriptError(
          "CONSENT_REQUIRED",
          "同意 Cookie 设置后仍无法获取页面。"
        );
      }
    }

    // 检测年龄限制 — 终端错误，不可恢复
    if (html.includes("Sign in to confirm your age")) {
      throw new TranscriptError(
        "AGE_RESTRICTED",
        "此视频需要年龄验证，无法获取字幕。"
      );
    }

    return html;
  }

  // ─── 第2步：提取 ytInitialPlayerResponse ────────────────────────────────

  /**
   * 从页面 HTML 提取 ytInitialPlayerResponse JSON 对象。
   *
   * YouTube 在页面中以 JavaScript 变量的形式嵌入播放器响应的全部数据，
   * 包括 captions、videoDetails、playabilityStatus 等。这与 InnerTube API
   * 返回的数据结构完全相同。
   *
   * 支持的声明格式：
   *   var ytInitialPlayerResponse = {...};
   *   ytInitialPlayerResponse = {...};
   *   window["ytInitialPlayerResponse"] = {...};
   *
   * 提取策略：找到变量声明后的第一个 '{'，使用大括号计数法扫描完整 JSON，
   * 正确处理字符串字面量、转义字符和嵌套对象。
   */
  private extractPlayerResponse(html: string): unknown {
    const patterns = [
      /var\s+ytInitialPlayerResponse\s*=\s*/,
      /(?:^|[^a-zA-Z_$])ytInitialPlayerResponse\s*=\s*/,
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

    const slice = html.slice(startIndex);
    const jsonStr = extractBalancedJson(slice);
    if (!jsonStr) return null;

    try {
      return JSON.parse(jsonStr) as unknown;
    } catch {
      return null;
    }
  }

  /** 公开版本：InnerTube provider 复用 */
  extractCaptionTracksPublic(playerResponse: unknown): CaptionTrack[] {
    return this.extractCaptionTracks(playerResponse);
  }
  rankTracksPublic(tracks: CaptionTrack[], preferredLang?: string): CaptionTrack[] {
    return this.rankTracks(tracks, preferredLang);
  }

  // ─── 第3步：提取字幕轨道 ───────────────────────────────────────────────

  /**
   * 从 playerResponse 中提取 captionTracks 数组。
   * path: captions.playerCaptionsTracklistRenderer.captionTracks
   */
  private extractCaptionTracks(playerResponse: unknown): CaptionTrack[] {
    const tracklist = get(
      playerResponse,
      "captions",
      "playerCaptionsTracklistRenderer"
    );

    if (!isRecord(tracklist)) return [];

    const captionTracks = tracklist["captionTracks"];
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) return [];

    const tracks: CaptionTrack[] = [];

    for (const raw of captionTracks) {
      if (!isRecord(raw)) continue;

      const baseUrl = raw["baseUrl"];
      const languageCode = raw["languageCode"];
      if (typeof baseUrl !== "string" || typeof languageCode !== "string") continue;

      // track name 可能有两种格式：simpleText 或 runs 数组
      const nameObj = raw["name"];
      let name = "";
      if (isRecord(nameObj)) {
        if (typeof nameObj["simpleText"] === "string") {
          name = nameObj["simpleText"];
        } else if (Array.isArray(nameObj["runs"])) {
          name = (nameObj["runs"] as Array<Record<string, unknown>>)
            .map((r) => (typeof r.text === "string" ? r.text : ""))
            .join("");
        }
      }

      tracks.push({
        baseUrl,
        languageCode,
        name,
        kind: raw["kind"] === "asr" ? "asr" : undefined,
        isTranslatable: raw["isTranslatable"] === true
      });
    }

    return tracks;
  }

  // ─── 第4步：轨道排序 ──────────────────────────────────────────────────

  /**
   * 按优先级排列字幕轨道，同时去重（同 languageCode 只保留优先级最高的）。
   *
   * 优先级（从高到低）：
   *   1. 用户指定语言的手动字幕
   *   2. 用户指定语言的自动字幕
   *   3. 英文手动字幕
   *   4. 英文自动字幕
   *   5. 任意语言手动字幕
   *   6. 任意语言自动字幕
   */
  private rankTracks(tracks: CaptionTrack[], preferredLang?: string): CaptionTrack[] {
    if (tracks.length === 0) return [];

    // 先去重 — 同语言优先保留手动字幕
    const seen = new Map<string, CaptionTrack>();
    for (const t of tracks) {
      const existing = seen.get(t.languageCode);
      if (!existing || (t.kind !== "asr" && existing.kind === "asr")) {
        seen.set(t.languageCode, t);
      }
    }

    const unique = [...seen.values()];

    // 归类
    const preferred = preferredLang?.toLowerCase();
    const manual = unique.filter((t) => t.kind !== "asr");
    const auto = unique.filter((t) => t.kind === "asr");

    const matchLang = (t: CaptionTrack, lang: string) =>
      t.languageCode === lang || t.languageCode.split("-")[0] === lang;

    const result: CaptionTrack[] = [];

    // 1. 指定语言的手动字幕
    if (preferred) {
      result.push(...manual.filter((t) => matchLang(t, preferred)));
    }

    // 2. 指定语言的自动字幕
    if (preferred) {
      result.push(...auto.filter((t) => matchLang(t, preferred)));
    }

    // 3. 英文手动
    result.push(...manual.filter((t) => matchLang(t, "en")));

    // 4. 英文自动
    result.push(...auto.filter((t) => matchLang(t, "en")));

    // 5. 其余手动（英语优先已处理，这里添加非英语）
    result.push(...manual.filter((t) => !result.includes(t)));

    // 6. 其余自动
    result.push(...auto.filter((t) => !result.includes(t)));

    return result;
  }

  // ─── 第5步：下载并解析字幕轨道 ────────────────────────────────────────

  /**
   * 下载单个字幕轨道的内容并解析为结构化片段。
   *
   * 自动检测格式：XML（新旧两种）、VTT（WebVTT）、JSON3（YouTube 内部格式）。
   * baseUrl 默认返回 XML 格式（YouTube 内部约定），这里保持 fmt=3 参数确保 XML。
   */
  private async downloadAndParse(track: CaptionTrack): Promise<TranscriptSegment[]> {
    const content = await this.downloadCaptionContent(track.baseUrl);
    const rawSegments = parseCaptionContent(content);

    const segments = rawSegments
      .filter((s) => s.text.length > 0 && Number.isFinite(s.start) && Number.isFinite(s.duration))
      .map((s) => ({
        startTime: s.start,
        endTime: s.start + s.duration,
        text: s.text
      }));

    return mergeIntoSentences(segments);
  }

  /** 下载字幕内容（纯文本） */
  private async downloadCaptionContent(baseUrl: string): Promise<string> {
    // 追加 fmt=3 参数确保获取 XML 格式（最易解析）
    const url = baseUrl.includes("?")
      ? `${baseUrl}&fmt=3`
      : `${baseUrl}?fmt=3`;

    try {
      const response = await fetchWithTimeout(url, {
        timeoutMs: 10000,
        service: "YouTube caption download",
        headers: { "User-Agent": USER_AGENT }
      });
      return response.text();
    } catch (err) {
      throw new Error(
        `字幕下载失败：${err instanceof Error ? err.message : "未知错误"}`
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON 提取器 — 大括号计数法
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 从字符串中提取第一个完整的 {} 平衡 JSON 对象。
 *
 * 从第一个 `{` 开始扫描，维护大括号计数，正确处理：
 *   - 字符串字面量中的 {} 不参与计数
 *   - 转义字符（\" \\ 等）
 *   - 嵌套对象和数组
 *   - 多行文本
 */
export function extractBalancedJson(text: string): string | null {
  // 定位第一个 '{'
  const openIndex = text.indexOf("{");
  if (openIndex === -1) return null;

  const slice = text.slice(openIndex);
  let depth = 0;
  let inString = false;
  let inSingleString = false;
  let escapeNext = false;

  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (ch === "\\") {
      escapeNext = true;
      continue;
    }

    if (ch === '"' && !inSingleString) {
      inString = !inString;
      continue;
    }

    if (ch === "'" && !inString) {
      inSingleString = !inSingleString;
      continue;
    }

    if (inString || inSingleString) continue;

    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return slice.slice(0, i + 1);
      }
    }
  }

  return null; // 无法闭合
}

// ═══════════════════════════════════════════════════════════════════════════════
// 字幕内容解析器 — 支持 XML / VTT / JSON3 三种格式
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 解析字幕内容，自动检测格式并分发到对应的解析器。
 */
export function parseCaptionContent(content: string): RawSegment[] {
  const trimmed = content.trim();

  if (!trimmed) return [];

  // 检测格式并解析
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<transcript") || trimmed.startsWith("<p ")) {
    return parseXmlCaptions(trimmed);
  }

  if (trimmed.startsWith("WEBVTT")) {
    return parseVttCaptions(trimmed);
  }

  if (trimmed.startsWith("{")) {
    const jsonResult = parseJson3Captions(trimmed);
    if (jsonResult.length > 0) return jsonResult;
  }

  // 格式未知，先尝试结构化的 XML，再尝试逐行解析
  const xmlResult = parseXmlCaptions(trimmed);
  if (xmlResult.length > 0) return xmlResult;

  const vttResult = parseVttCaptions(trimmed);
  if (vttResult.length > 0) return vttResult;

  return [];
}

// ─── XML 解析器 ──────────────────────────────────────────────────────────

/**
 * 解析 YouTube 字幕 XML（两种历史格式）。
 *
 * 格式1（新，毫秒）：<p t="1234" d="5678" ...>文本</p>
 * 格式2（旧，秒）：  <text start="1.234" dur="5.678" ...>文本</text>
 */
function parseXmlCaptions(xml: string): RawSegment[] {
  // 格式1：<p t="毫秒" d="毫秒">
  const pMatches = [...xml.matchAll(/<p\s[^>]*\bt="([^"]*)"[^>]*\bd="([^"]*)"[^>]*>([\s\S]*?)<\/p>/g)];
  if (pMatches.length > 0) {
    return pMatches
      .map((m) => ({
        start: Number(m[1]) / 1000,
        duration: Number(m[2]) / 1000,
        text: cleanCaptionText(m[3])
      }))
      .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.duration) && s.text);
  }

  // 格式1变体：a 或 d 属性可能缺失
  const pLoose = [...xml.matchAll(/<p\s[^>]*\bt="([^"]*)"[^>]*>([\s\S]*?)<\/p>/g)];
  if (pLoose.length > 0) {
    return pLoose
      .map((m, i, arr) => {
        const start = Number(m[1]) / 1000;
        const next = arr[i + 1];
        const nextStart = next ? Number(next[1]) / 1000 : start + 5;
        const duration = Math.max(0, nextStart - start);
        return { start, duration, text: cleanCaptionText(m[2]) };
      })
      .filter((s) => Number.isFinite(s.start) && s.text);
  }

  // 格式2：<text start="秒" dur="秒">
  const textMatches = [...xml.matchAll(/<text\s[^>]*\bstart="([^"]*)"[^>]*\bdur="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g)];
  if (textMatches.length > 0) {
    return textMatches
      .map((m) => ({
        start: Number(m[1]),
        duration: Number(m[2]),
        text: cleanCaptionText(m[3])
      }))
      .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.duration) && s.text);
  }

  return [];
}

// ─── VTT 解析器 ──────────────────────────────────────────────────────────

/**
 * 解析 WebVTT 字幕格式。
 *
 * 格式：
 *   WEBVTT
 *
 *   00:00:01.230 --> 00:00:05.670
 *   Hello world
 *
 *   00:00:06.000 --> 00:00:10.500
 *   Second line
 */
function parseVttCaptions(vtt: string): RawSegment[] {
  const segments: RawSegment[] = [];
  const lines = vtt.split(/\r?\n/);

  // 跳过 WEBVTT 头部
  let i = 0;
  while (i < lines.length && (lines[i].startsWith("WEBVTT") || lines[i].trim() === "" || lines[i].startsWith("Kind:") || lines[i].startsWith("Language:"))) {
    i++;
  }

  let currentStart: number | null = null;
  let currentEnd: number | null = null;
  let currentText: string[] = [];

  const flush = () => {
    if (currentStart !== null && currentEnd !== null && currentText.length > 0) {
      segments.push({
        start: currentStart,
        duration: currentEnd - currentStart,
        text: cleanCaptionText(currentText.join("\n"))
      });
    }
    currentStart = null;
    currentEnd = null;
    currentText = [];
  };

  for (; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过序号行和空行
    if (line === "") {
      flush();
      continue;
    }

    // 时间戳行：00:00:01.230 --> 00:00:05.670
    const timeMatch = line.match(
      /((?:\d{2}:)?\d{2}:\d{2}(?:[.,]\d{3})?)\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}(?:[.,]\d{3})?)/
    );

    if (timeMatch) {
      flush();
      currentStart = parseVttTimestamp(timeMatch[1]);
      currentEnd = parseVttTimestamp(timeMatch[2]);
    } else if (currentStart !== null) {
      // 文本行（跳过 VTT 标签如 <c>、<v>、<00:00:01>）
      const cleaned = line.replace(/<[^>]*>/g, "");
      if (cleaned) {
        currentText.push(cleaned);
      }
    }
  }

  flush();
  return segments;
}

/** 解析 VTT 时间戳：HH:MM:SS.mmm 或 MM:SS.mmm */
function parseVttTimestamp(ts: string): number {
  const parts = ts.split(":");
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2].replace(",", "."));
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1].replace(",", "."));
  }
  return Number(ts.replace(",", "."));
}

// ─── JSON3 解析器 ────────────────────────────────────────────────────────

/**
 * 解析 YouTube JSON3 字幕格式。
 *
 * JSON3 结构：
 * {
 *   "events": [
 *     { "tStartMs": 1234, "dDurationMs": 5678, "segs": [{ "utf8": "text" }] },
 *     ...
 *   ]
 * }
 */
function parseJson3Captions(json: string): RawSegment[] {
  try {
    const data = JSON.parse(json) as unknown;
    if (!isRecord(data)) return [];

    const events = data["events"];
    if (!Array.isArray(events)) return [];

    const segments: RawSegment[] = [];

    for (const evt of events) {
      if (!isRecord(evt)) continue;

      const tStartMs = typeof evt["tStartMs"] === "number" ? evt["tStartMs"] : 0;
      const dDurationMs = typeof evt["dDurationMs"] === "number" ? evt["dDurationMs"] : 0;

      const segs = evt["segs"];
      const text = Array.isArray(segs)
        ? segs
            .filter(isRecord)
            .map((s) => (typeof s["utf8"] === "string" ? s["utf8"] : ""))
            .join(" ")
        : "";

      const cleaned = cleanCaptionText(text);
      if (cleaned && Number.isFinite(tStartMs) && Number.isFinite(dDurationMs)) {
        segments.push({
          start: tStartMs / 1000,
          duration: dDurationMs / 1000,
          text: cleaned
        });
      }
    }

    return segments;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 外部 API 回退（Supadata）
// ═══════════════════════════════════════════════════════════════════════════════

export class ExternalApiTranscriptProvider implements TranscriptProvider {
  async getTranscript(videoId: string, preferredLang?: string): Promise<TranscriptSegment[]> {
    const supadataKey = process.env.SUPADATA_API_KEY;
    if (!supadataKey) {
      throw new TranscriptError(
        "ALL_TRACKS_FAILED",
        "未配置 SUPADATA_API_KEY，外部转录 API 不可用。"
      );
    }

    const lang = preferredLang ?? "en";
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

    const response = await fetchWithTimeout(
      `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url)}&lang=${lang}`,
      {
        timeoutMs: 15000,
        service: "Supadata",
        headers: { "x-api-key": supadataKey }
      }
    );

    const data: unknown = await response.json();
    const segments = this.parseSupadataResponse(data);

    if (segments.length === 0) {
      throw new TranscriptError("CAPTION_DOWNLOAD_FAILED", "Supadata 未返回字幕。");
    }

    return mergeIntoSentences(segments);
  }

  private parseSupadataResponse(data: unknown): TranscriptSegment[] {
    const content = isRecord(data)
      ? (data["content"] ?? data["transcript"] ?? data)
      : data;

    if (!Array.isArray(content)) return [];

    // 时间戳单位检测
    const samples = content.slice(0, 5);
    let isMs = false;
    if (samples.length > 0) {
      const avg =
        samples.reduce((sum: number, s) => {
          if (!isRecord(s)) return sum;
          const offset = Number(s["offset"] ?? s["start"] ?? 0);
          return sum + (Number.isFinite(offset) ? offset : 0);
        }, 0) / samples.length;
      isMs = avg > 500;
    }

    const segments: TranscriptSegment[] = [];

    for (const item of content) {
      if (!isRecord(item)) continue;

      const rawStart = item["offset"] ?? item["start"] ?? 0;
      const startTime = Number(rawStart) / (isMs ? 1000 : 1);
      const text =
        typeof item.text === "string"
          ? decodeHtml(item.text.replace(/<[^>]*>/g, " ").trim())
          : "";

      if (Number.isFinite(startTime) && text) {
        segments.push({ startTime, endTime: startTime + 5, text });
      }
    }

    return segments;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 多层回退编排
// ═══════════════════════════════════════════════════════════════════════════════

export class FallbackTranscriptProvider implements TranscriptProvider {
  private readonly chain: TranscriptProvider[];

  constructor(...providers: TranscriptProvider[]) {
    this.chain = providers;
  }

  async getTranscript(videoId: string, preferredLang?: string): Promise<TranscriptSegment[]> {
    const errors: string[] = [];
    for (const provider of this.chain) {
      try {
        return await provider.getTranscript(videoId, preferredLang);
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
      new YoutubeTranscriptPackageProvider(), // 第一层：youtube-transcript npm 包
      new InnertubeTranscriptProvider(),      // 第二层：InnerTube API
      new YouTubeTranscriptProvider(),        // 第三层：HTML 爬取
      new ExternalApiTranscriptProvider()     // 第四层：Supadata API
    );
  }

  throw new Error(
    `TRANSCRIPT_PROVIDER "${provider}" is invalid. Set to "youtube".`
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/** 清理字幕文本：去除 HTML 标签、实体、多余空白 */
export function cleanCaptionText(raw: string): string {
  return decodeHtml(
    raw
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 句子合并器 — 将字幕片段按句子粒度重新划分
// 参考 Longcut：增加缩写/小数/TLD 检测、安全上限、智能拆分
// ═══════════════════════════════════════════════════════════════════════════════

/** 句子结束标点正则（全局匹配用） */
const SENTENCE_END_RE = /[.!?。！？]/g;

/** 两段之间允许的最大时间间隙（秒），超过则不合并 */
const MAX_MERGE_GAP = 0.5;

/** 单个句子的安全上限 */
const MAX_SENTENCE_DURATION_SECONDS = 24;
const MAX_SENTENCE_WORDS = 40;
const MIN_SENTENCE_WORDS = 8;

/** 常见缩写（后面的 . 不是句尾） */
const ABBREVIATIONS = new Set([
  "dr", "mr", "mrs", "ms", "vs", "etc", "inc", "ltd", "jr", "sr",
  "prof", "dept", "est", "gov", "st", "ave", "blvd", "rd",
]);

/** 常见 TLD 和文件扩展名（前面的 . 不是句尾） */
const TLD_AND_EXTENSIONS = new Set([
  "com", "org", "net", "edu", "gov", "io", "ai", "co", "uk",
  "txt", "pdf", "js", "ts", "jsx", "tsx", "html", "css", "json",
  "png", "jpg", "jpeg", "gif", "svg", "mp4", "mp3", "wav",
]);

/** 判断给定位置的 . 是否真的是句子结束（排除小数、缩写、TLD） */
function isSentenceEndingPeriod(text: string, periodIndex: number): boolean {
  const charBefore = periodIndex > 0 ? text[periodIndex - 1] : "";
  const charAfter = periodIndex < text.length - 1 ? text[periodIndex + 1] : "";

  // 小数：前后都是数字
  if (/\d/.test(charBefore) && /\d/.test(charAfter)) return false;

  // 检查前面是否为缩写词
  const beforeText = text.slice(0, periodIndex).trimEnd();
  const lastWord = beforeText.split(/\s+/).pop()?.toLowerCase() ?? "";
  if (ABBREVIATIONS.has(lastWord)) return false;

  // 检查后面是否为 TLD 或文件扩展名
  const afterWord = text.slice(periodIndex + 1).trimStart().split(/\s+/)[0]?.toLowerCase() ?? "";
  const cleanAfter = afterWord.replace(/^[^a-z0-9]+/, "").replace(/[^a-z0-9]+$/, "");
  if (TLD_AND_EXTENSIONS.has(cleanAfter)) return false;

  return true;
}

/** 判断文本是否以句子结束标点结尾 */
function endsWithSentence(text: string): boolean {
  const trimmed = text.trimEnd();
  if (trimmed.length === 0) return false;
  const lastChar = trimmed[trimmed.length - 1];

  // ! ? 。 ！ ？ 直接算句子结束
  if (/[!?。！？]/.test(lastChar)) return true;

  // . 需要进一步判断（排除小数、缩写等）
  if (lastChar === ".") {
    return isSentenceEndingPeriod(trimmed, trimmed.length - 1);
  }

  return false;
}

/**
 * 将字幕片段按句子粒度合并。
 *
 * YouTube 字幕以屏幕行为单位分割，一句话经常被拆成多个 <p> 标签。
 * 三阶段处理：
 * 1. 按时间间隙 + 句子标点合并相邻片段
 * 2. 在合并后的文本内部按标点边界切分
 * 3. 安全网：对超长句子（>40词 / >24秒）强制拆分，最短不低於8词
 */
export function mergeIntoSentences(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (segments.length === 0) return [];

  // ═══ 第一步：按间隙合并 ═══
  const merged: { text: string; startTime: number; endTime: number }[] = [];
  let current = {
    text: segments[0].text,
    startTime: segments[0].startTime,
    endTime: segments[0].endTime,
  };

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];
    const gap = next.startTime - current.endTime;

    if (gap <= MAX_MERGE_GAP && !endsWithSentence(current.text.trimEnd())) {
      current.endTime = next.endTime;
      current.text = current.text + " " + next.text;
    } else {
      merged.push(current);
      current = {
        text: next.text,
        startTime: next.startTime,
        endTime: next.endTime,
      };
    }
  }
  merged.push(current);

  // ═══ 第二步：按内部标点 + 大小写边界切分 ═══
  const split: TranscriptSegment[] = [];
  for (const seg of merged) {
    const parts = splitByBoundary(seg.text);
    if (parts.length <= 1) {
      split.push({ startTime: seg.startTime, endTime: seg.endTime, text: seg.text });
      continue;
    }
    // 按文本长度比例分配时间戳
    const totalLen = seg.text.length || 1;
    const duration = Math.max(seg.endTime - seg.startTime, 0.1);
    let offset = 0;
    for (const part of parts) {
      const ratio = part.length / totalLen;
      split.push({
        text: part.trim(),
        startTime: seg.startTime + offset,
        endTime: seg.startTime + offset + duration * ratio,
      });
      offset += duration * ratio;
    }
  }

  // ═══ 第三步：安全网 — 限制超长句子 ═══
  const result: TranscriptSegment[] = [];
  for (const seg of split) {
    const words = seg.text.split(/\s+/);
    const segDuration = seg.endTime - seg.startTime;
    const needsSplit =
      words.length > MAX_SENTENCE_WORDS ||
      segDuration > MAX_SENTENCE_DURATION_SECONDS;

    if (!needsSplit) {
      result.push(seg);
      continue;
    }

    const subChunks = splitLongSentence(seg.text);
    const totalLen = seg.text.length || 1;
    const totalDuration = Math.max(segDuration, 0.1);
    let offset = 0;
    for (const chunk of subChunks) {
      const ratio = chunk.length / totalLen;
      result.push({
        text: chunk.trim(),
        startTime: seg.startTime + offset,
        endTime: seg.startTime + offset + totalDuration * ratio,
      });
      offset += totalDuration * ratio;
    }
  }

  return result;
}

/** 在标点和大写字母处切分文本（对 . 做缩写/小数/TLD 排除） */
function splitByBoundary(text: string): string[] {
  const splits: number[] = [];

  // 找到所有句子结束标点位置
  SENTENCE_END_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SENTENCE_END_RE.exec(text)) !== null) {
    const idx = match.index;
    const punct = match[0];

    // 对 . 做额外检查，排除小数、缩写、TLD
    if (punct === "." && !isSentenceEndingPeriod(text, idx)) continue;

    const after = text.slice(idx + 1);
    if (after.length === 0 || /^[\s]/.test(after) || /^[A-Z一-鿿]/.test(after)) {
      splits.push(idx + 1);
    }
  }

  // 找到可作为句子开头的大写字母位置
  const CAP_START_RE = /(?:[a-z]\s+|[.!?。！？]\s+)([A-Z])/g;
  CAP_START_RE.lastIndex = 0;
  while ((match = CAP_START_RE.exec(text)) !== null) {
    const capIdx = match.index + match[0].length - 1;
    splits.push(capIdx);
  }

  splits.sort((a, b) => a - b);

  // 去重（相邻太近的合并，< 3 字符间距视为同一位置）
  const unique: number[] = [];
  for (const s of splits) {
    if (unique.length === 0 || s - unique[unique.length - 1] > 3) {
      unique.push(s);
    }
  }

  if (unique.length === 0) return [text];

  // 过滤掉会产生过短句子的切分点（前一部分或后一部分不足 MIN_SENTENCE_WORDS 个词）
  const filtered: number[] = [];
  for (const idx of unique) {
    const beforeText = text.slice(0, idx).trim();
    const afterText = text.slice(idx).trim();
    const beforeWords = beforeText ? beforeText.split(/\s+/).length : 0;
    const afterWords = afterText ? afterText.split(/\s+/).length : 0;
    if (beforeWords >= MIN_SENTENCE_WORDS && afterWords >= MIN_SENTENCE_WORDS) {
      filtered.push(idx);
    }
  }

  if (filtered.length === 0) return [text];

  const parts: string[] = [];
  let last = 0;
  for (const idx of filtered) {
    const part = text.slice(last, idx).trim();
    if (part) parts.push(part);
    last = idx;
  }
  const tail = text.slice(last).trim();
  if (tail) parts.push(tail);

  return parts.length > 1 ? parts : [text];
}

/** 将超长句子在单词边界智能拆分 */
function splitLongSentence(text: string): string[] {
  const words = text.split(/\s+/);
  if (words.length <= MAX_SENTENCE_WORDS) {
    // 词数不超标（但时长超标了），按词数均分
    const mid = Math.floor(words.length / 2);
    if (mid === 0) return [text];
    return [
      words.slice(0, mid).join(" "),
      words.slice(mid).join(" "),
    ];
  }

  // 在大写单词处找到切分点
  const capIndices: number[] = [];
  for (let i = 1; i < words.length; i++) {
    if (/^[A-Z]/.test(words[i])) {
      capIndices.push(i);
    }
  }

  const chunks: string[] = [];
  let start = 0;

  for (const idx of capIndices) {
    const chunkLen = idx - start;
    if (chunkLen >= MIN_SENTENCE_WORDS && chunkLen <= MAX_SENTENCE_WORDS) {
      chunks.push(words.slice(start, idx).join(" "));
      start = idx;
    }
  }

  // 剩余部分按 MAX_SENTENCE_WORDS 均分
  const rest = words.slice(start);
  if (rest.length > 0) {
    for (let i = 0; i < rest.length; i += MAX_SENTENCE_WORDS) {
      chunks.push(rest.slice(i, i + MAX_SENTENCE_WORDS).join(" "));
    }
  }

  return chunks.length > 1 ? chunks : [text];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 安全地从嵌套对象/数组中取值。
 * 路径支持字符串 key（对象）和数字 index（数组）。
 */
export function get(obj: unknown, ...path: (string | number)[]): unknown {
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
