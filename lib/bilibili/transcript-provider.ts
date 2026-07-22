import { type TranscriptSegment } from "@/lib/types";
import { fetchJsonWithTimeout, fetchWithTimeout } from "@/lib/utils/http";
import {
  cleanCaptionText,
  isRecord,
  mergeIntoSentences,
  type TranscriptProvider
} from "@/lib/youtube/transcript-provider";
import { fetchBilibiliMetadata } from "@/lib/bilibili/metadata";
import { BilibiliAntiRiskManager } from "@/lib/bilibili/risk-manager";

// Bilibili 字幕 JSON 文件格式定义
interface BilibiliSubtitleItem {
  from: number;
  to: number;
  content: string;
}

interface BilibiliSubtitleTrack {
  lan: string;
  lan_doc: string;
  subtitle_url: string;
  is_ai: boolean;
}

export type BilibiliMetadata = Awaited<ReturnType<typeof fetchBilibiliMetadata>>;
export type BilibiliProgressEvent = "metadata" | "soft_subtitle" | "asr_start" | "asr_chunk" | "complete" | "error";
export type BilibiliProgressData = BilibiliMetadata | TranscriptSegment[] | { duration: number };
export type BilibiliProgressCallback = (event: BilibiliProgressEvent, data: BilibiliProgressData) => void;

export class BilibiliTranscriptProvider implements TranscriptProvider {
  async getTranscript(
    videoId: string, 
    preferredLang?: string,
    onProgress?: BilibiliProgressCallback
  ): Promise<TranscriptSegment[]> {
    console.log(`[Bilibili:Transcript] 开始为视频 ${videoId} 提取字幕，首选语言: ${preferredLang ?? "未指定"}`);
    const riskManager = BilibiliAntiRiskManager.getInstance();

    // 1. 获取视频基本信息与字幕列表
    const metadata = await fetchBilibiliMetadata(videoId);
    onProgress?.("metadata", metadata); // 流式推送第一步：秒开卡片

    const bvid = metadata.videoId;
    const cid = metadata.cid;

    // 重新抓取一次详细的 view 接口，提取字幕轨道
    const viewEndpoint = `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`;
    const viewData = await fetchJsonWithTimeout<unknown>(viewEndpoint, {
      timeoutMs: 8000,
      service: "Bilibili view for subtitles",
      headers: riskManager.getHeaders() // 注入风控 headers
    });

    if (!isRecord(viewData) || viewData.code !== 0 || !isRecord(viewData.data)) {
      throw new Error(`无法获取B站字幕列表：API响应异常`);
    }

    const subtitleObj = viewData.data.subtitle;
    const tracks = isRecord(subtitleObj) && Array.isArray(subtitleObj.list) ? subtitleObj.list : [];

    console.log(`[Bilibili:Transcript] 找到 ${tracks.length} 个软字幕轨道`);

    // 2. 如果存在字幕轨道，按优先级进行匹配和下载
    if (tracks.length > 0) {
      const ranked = this.rankBilibiliTracks(tracks, preferredLang);
      
      const errors: string[] = [];
      for (const track of ranked) {
        try {
          const segments = await this.downloadAndParseSubtitle(track.subtitle_url);
          if (segments.length > 0) {
            console.log(`[Bilibili:Transcript] 成功抓取软字幕，轨道语言: ${track.lan} (${track.lan_doc})`);
            onProgress?.("soft_subtitle", segments); // 流式推送第二步（软字幕直接出）
            return segments;
          }
        } catch (err) {
          errors.push(`${track.lan}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      console.warn(`[Bilibili:Transcript] 所有软字幕轨道下载均失败: ${errors.join(" | ")}`);
    }

    // 3. 🔥 ASR 兜底转写流程：无软字幕时，抓取原生音频，调用国内直连 ASR 服务
    console.log(`[Bilibili:Transcript] 软字幕为空或下载失败，启动硬核 ASR 语音识别兜底链路...`);
    onProgress?.("asr_start", { duration: metadata.duration }); // 流式推送第二步（硬转写告知开始）
    
    const segments = await this.transcribeAudioStream(bvid, cid, metadata.duration);
    onProgress?.("asr_chunk", segments); // 流式推送第三步（硬转写数据包）
    
    return segments;
  }

  /**
   * 对 B站 字幕轨道进行优先级排序与降级排列
   * 优先级：手动英文 > 自动英文 > 手动中文 > 自动中文 > 其它手动 > 其它自动
   */
  private rankBilibiliTracks(tracks: unknown[], preferredLang?: string): BilibiliSubtitleTrack[] {
    const preferred = preferredLang?.toLowerCase();

    // 格式化轨道信息
    const formatted = tracks
      .filter(isRecord)
      .map((track): BilibiliSubtitleTrack => {
        const lan = String(track.lan ?? "").toLowerCase();
        const rawSubtitleUrl = String(track.subtitle_url ?? "");
        return {
          lan,
          lan_doc: String(track.lan_doc ?? ""),
          subtitle_url: rawSubtitleUrl.startsWith("//") ? `https:${rawSubtitleUrl}` : rawSubtitleUrl,
          is_ai: lan.startsWith("ai-") || track.ai_status === 2 || track.ai_type === 1,
        };
      })
      .filter((track) => Boolean(track.subtitle_url));

    // 归类
    const manual = formatted.filter((t) => !t.is_ai);
    const auto = formatted.filter((t) => t.is_ai);

    const isMatch = (track: BilibiliSubtitleTrack, lang: string) => track.lan.includes(lang);

    const result: BilibiliSubtitleTrack[] = [];

    // 1. 首选指定语言的非 AI 字幕
    if (preferred) {
      result.push(...manual.filter((t) => isMatch(t, preferred)));
    }

    // 2. 首选指定语言的 AI 字幕
    if (preferred) {
      result.push(...auto.filter((t) => isMatch(t, preferred)));
    }

    // 3. 英文手动字幕
    result.push(...manual.filter((t) => isMatch(t, "en")));

    // 4. 英文自动字幕
    result.push(...auto.filter((t) => isMatch(t, "en")));

    // 5. 中文手动字幕 (zh-CN, zh-Hans, zh-Hant)
    result.push(...manual.filter((t) => isMatch(t, "zh")));

    // 6. 中文自动字幕
    result.push(...auto.filter((t) => isMatch(t, "zh")));

    // 7. 其余手动
    result.push(...manual.filter((t) => !result.includes(t)));

    // 8. 其余自动
    result.push(...auto.filter((t) => !result.includes(t)));

    return result;
  }

  /**
   * 下载 B站 的 JSON 字幕文件并解析为统一的 TranscriptSegment 数组
   */
  private async downloadAndParseSubtitle(url: string): Promise<TranscriptSegment[]> {
    const res = await fetchWithTimeout(url, {
      timeoutMs: 8000,
      service: "Bilibili Subtitle Downloader",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com"
      }
    });

    const data = (await res.json()) as unknown;
    if (!isRecord(data) || !Array.isArray(data.body)) {
      throw new Error("字幕文件格式不是标准的 Bilibili Subtitle JSON");
    }

    const rawSegments: BilibiliSubtitleItem[] = data.body as BilibiliSubtitleItem[];

    const segments = rawSegments
      .filter((s) => s.content && Number.isFinite(s.from) && Number.isFinite(s.to))
      .map((s) => ({
        startTime: s.from,
        endTime: s.to,
        text: cleanCaptionText(s.content)
      }));

    return mergeIntoSentences(segments);
  }

  /**
   * 🔥 下载原声 Dash 音频流，并使用国内极速 OpenAI 兼容 Whisper ASR API 进行转写
   */
  private async transcribeAudioStream(bvid: string, cid: number, duration: number): Promise<TranscriptSegment[]> {
    const asrBaseUrl = (process.env.ASR_API_BASE_URL ?? "https://api.siliconflow.cn/v1").trim().replace(/\/$/, "");
    const asrKey = (process.env.ASR_API_KEY ?? "").trim();
    const asrModel = (process.env.ASR_MODEL ?? "FunASR/SenseVoiceSmall").trim();
    const riskManager = BilibiliAntiRiskManager.getInstance();

    if (!asrKey) {
      throw new Error("未配置 ASR_API_KEY，无法执行真实音频 ASR 语音识别转写");
    }

    console.log(`[Bilibili:Transcript] 1. 正在请求 B站 playurl 获取原声音频流地址...`);
    const playUrlEndpoint = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=16&fnval=16`;
    const playUrlData = await fetchJsonWithTimeout<unknown>(playUrlEndpoint, {
      timeoutMs: 8000,
      service: "Bilibili playurl API",
      headers: riskManager.getHeaders() // 注入风控 headers
    });

    if (!isRecord(playUrlData) || playUrlData.code !== 0 || !isRecord(playUrlData.data)) {
      throw new Error(`无法获取B站视频播放流：API 响应异常`);
    }

    const dash = playUrlData.data.dash;
    if (!isRecord(dash) || !Array.isArray(dash.audio) || dash.audio.length === 0) {
      throw new Error(`B站视频返回的播放流中未包含 Dash 音频流，无法进行转写`);
    }

    const audioUrl = String(dash.audio[0].baseUrl ?? "");
    if (!audioUrl) {
      throw new Error(`B站音频流地址 baseUrl 为空`);
    }

    console.log(`[Bilibili:Transcript] 2. 成功获取音频流地址，开始极速流式下载音频...`);
    const audioResponse = await fetchWithTimeout(audioUrl, {
      timeoutMs: 25000,
      service: "Bilibili Audio Stream Downloader",
      headers: riskManager.getHeaders() // 注入防盗链 headers
    });

    if (!audioResponse.ok) {
      throw new Error(`音频流下载失败，HTTP 状态码: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    console.log(`[Bilibili:Transcript] 音频下载完毕，文件大小: ${(audioBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    console.log(`[Bilibili:Transcript] 3. 开始调用国内直连 ASR 识别 API (${asrModel})...`);

    // 带重试的 ASR 请求
    const MAX_ASR_RETRIES = 3;
    const RETRY_DELAYS = [2000, 4000]; // 重试间隔

    let asrData: unknown = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ASR_RETRIES; attempt++) {
      console.log(`[Bilibili:Transcript] ASR 尝试 #${attempt}/${MAX_ASR_RETRIES}...`);

      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mp4" });
      formData.append("file", audioBlob, "audio.m4a");
      formData.append("model", asrModel);

      const asrController = new AbortController();
      const asrTimeout = setTimeout(() => asrController.abort(), 120_000);

      let transcribeResponse: Response;
      try {
        transcribeResponse = await fetch(`${asrBaseUrl}/audio/transcriptions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${asrKey}`
          },
          body: formData,
          signal: asrController.signal
        });
      } catch (fetchError) {
        clearTimeout(asrTimeout);
        const isAbort = fetchError instanceof DOMException && fetchError.name === "AbortError";
        lastError = new Error(isAbort
          ? `ASR 语音识别超时（120秒），请确认音频文件大小是否过大`
          : `ASR 语音识别网络请求失败: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        console.warn(`[Bilibili:Transcript] ASR 尝试 #${attempt} 网络异常:`, lastError.message);
        if (attempt < MAX_ASR_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1] ?? 4000));
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(asrTimeout);
      }

      if (!transcribeResponse.ok) {
        const errText = await transcribeResponse.text().catch(() => "");
        console.error(`[Bilibili:Transcript] ASR 尝试 #${attempt} 返回错误 (${transcribeResponse.status}):`, errText.slice(0, 500));
        lastError = new Error(`ASR 语音识别服务返回错误 (HTTP ${transcribeResponse.status}): ${errText.slice(0, 200)}`);
        if (transcribeResponse.status >= 500 && attempt < MAX_ASR_RETRIES) {
          console.log(`[Bilibili:Transcript] 服务端错误，${RETRY_DELAYS[attempt - 1] ?? 4000}ms 后重试...`);
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1] ?? 4000));
          continue;
        }
        throw lastError;
      }

      asrData = (await transcribeResponse.json()) as unknown;
      lastError = null;
      break;
    }

    if (!asrData) {
      throw lastError ?? new Error("ASR 语音识别请求全部失败");
    }

    // 优先使用标准 segments
    if (isRecord(asrData) && Array.isArray(asrData.segments)) {
      const rawSegments = asrData.segments;
      console.log(`[Bilibili:Transcript] ASR 语音转写成功 (带 segments)，共识别出 ${rawSegments.length} 句！`);
      const segments = rawSegments
        .filter((s) => s.text && Number.isFinite(s.start) && Number.isFinite(s.end))
        .map((s) => ({
          startTime: Number(s.start),
          endTime: Number(s.end),
          text: cleanCaptionText(String(s.text))
        }));
      return mergeIntoSentences(segments);
    }

    // 兜底使用纯长文本的高精度比例句段切分算法（如硅基流动 SenseVoice 部署）
    if (isRecord(asrData) && typeof asrData.text === "string" && asrData.text.trim()) {
      console.log("[Bilibili:Transcript] ASR 语音转写成功 (无 segments)，启动高精度比例分句算法...");
      return this.splitTextIntoProportionalSegments(asrData.text, duration);
    }

    throw new Error("ASR 转写接口未返回任何有效的 segments 数组或 text 文本内容");
  }

  /**
   * 将无时间戳的长文本根据标点、字数比例，高精度切分为带有时间戳的 TranscriptSegment 数组
   */
  private splitTextIntoProportionalSegments(text: string, totalDuration: number): TranscriptSegment[] {
    // 按照中英文主要标点进行第一级分句
    const parts = text
      .split(/([。！？；.!?\n🎼]|\s{2,})/u)
      .map((s) => s.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    let currentChunk = "";
    for (const part of parts) {
      if (/^[。！？；.!?🎼]$/u.test(part)) {
        currentChunk += part;
        chunks.push(currentChunk);
        currentChunk = "";
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = part;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    const validChunks = chunks.map((c) => c.trim()).filter((c) => c.length > 0);
    if (validChunks.length === 0) {
      return [{ startTime: 0, endTime: totalDuration, text }];
    }

    // 第二级句读细化：若句子超过 35 个字符，以逗号为界继续切分，保障移动端高亮连贯性
    const finalChunks: string[] = [];
    for (const chunk of validChunks) {
      if (chunk.length > 35) {
        const subParts = chunk.split(/([，,])+/);
        let currentSub = "";
        for (const sub of subParts) {
          if (/^[，,]$/.test(sub)) {
            currentSub += sub;
            finalChunks.push(currentSub);
            currentSub = "";
          } else {
            if (currentSub) {
              finalChunks.push(currentSub);
            }
            currentSub = sub.trim();
          }
        }
        if (currentSub) {
          finalChunks.push(currentSub);
        }
      } else {
        finalChunks.push(chunk);
      }
    }
    const cleanFinalChunks = finalChunks.map(c => c.trim()).filter(c => c.length > 0);

    const totalChars = cleanFinalChunks.reduce((sum, c) => sum + c.length, 0);

    // 3. 极速均匀分配时间戳
    const segments: TranscriptSegment[] = [];
    let currentStart = 0;
    for (let i = 0; i < cleanFinalChunks.length; i++) {
      const chunk = cleanFinalChunks[i];
      const chunkDuration = (chunk.length / totalChars) * totalDuration;
      const endTime = Math.min(currentStart + chunkDuration, totalDuration);

      segments.push({
        startTime: Number(currentStart.toFixed(2)),
        endTime: Number(endTime.toFixed(2)),
        text: cleanCaptionText(chunk)
      });
      currentStart = endTime;
    }

    return segments;
  }
}
