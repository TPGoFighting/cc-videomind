import { type VideoMetadata } from "@/lib/types";

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class BilibiliAntiRiskManager {
  private static instance: BilibiliAntiRiskManager | null = null;
  private cookies: string[] = [];
  private currentIndex = 0;
  
  // 简易内存缓存，防止短时间内高频请求同一视频触发风控
  private metadataCache = new Map<string, CacheEntry<VideoMetadata & { description: string; cid: number; duration: number }>>();
  private CACHE_TTL_MS = 10 * 60 * 1000; // 缓存 10 分钟

  private constructor() {
    this.loadCookies();
  }

  public static getInstance(): BilibiliAntiRiskManager {
    if (!BilibiliAntiRiskManager.instance) {
      BilibiliAntiRiskManager.instance = new BilibiliAntiRiskManager();
    }
    return BilibiliAntiRiskManager.instance;
  }

  private loadCookies() {
    const rawEnv = process.env.BILI_SESSDATA_POOL ?? "";
    this.cookies = rawEnv
      .split(",")
      .map(c => c.trim())
      .filter(Boolean);
    console.log(`[Bilibili:AntiRisk] 初始化 Cookie 池成功，已加载 ${this.cookies.length} 个 SESSDATA Cookie`);
  }

  /**
   * 轮询获取下一个请求 Header，包含防爬虫伪装
   */
  public getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.bilibili.com"
    };

    if (this.cookies.length > 0) {
      const cookie = this.cookies[this.currentIndex];
      headers["Cookie"] = `SESSDATA=${cookie}`;
      this.currentIndex = (this.currentIndex + 1) % this.cookies.length;
    }

    return headers;
  }

  /**
   * 获取缓存的元数据
   */
  public getMetadata(videoId: string) {
    const entry = this.metadataCache.get(videoId);
    if (entry && entry.expiry > Date.now()) {
      console.log(`[Bilibili:AntiRisk] 元数据命中内存缓存 videoId=${videoId}`);
      return entry.data;
    }
    if (entry) {
      this.metadataCache.delete(videoId);
    }
    return null;
  }

  /**
   * 写入元数据缓存
   */
  public setMetadata(videoId: string, data: VideoMetadata & { description: string; cid: number; duration: number }) {
    this.metadataCache.set(videoId, {
      data,
      expiry: Date.now() + this.CACHE_TTL_MS
    });
  }
}
