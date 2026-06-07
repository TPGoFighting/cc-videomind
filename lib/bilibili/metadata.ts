import { z } from "zod";
import { VideoMetadataSchema, type VideoMetadata } from "@/lib/types";
import { fetchJsonWithTimeout } from "@/lib/utils/http";
import { buildBilibiliWatchUrl } from "@/lib/bilibili/id";
import { BilibiliAntiRiskManager } from "@/lib/bilibili/risk-manager";

// Bilibili API 返回的原始数据 Schema 校验
const BilibiliViewApiSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({
    bvid: z.string(),
    aid: z.number(),
    cid: z.number(),
    pic: z.string(),
    title: z.string(),
    desc: z.string().optional(),
    duration: z.number(),
    owner: z.object({
      name: z.string()
    })
  })
});

export type BilibiliViewData = z.infer<typeof BilibiliViewApiSchema>["data"];

/**
 * 获取 B站 视频的元数据信息
 */
export async function fetchBilibiliMetadata(videoId: string): Promise<VideoMetadata & { description: string; cid: number; duration: number }> {
  const riskManager = BilibiliAntiRiskManager.getInstance();
  
  // 1. 尝试从内存缓存中获取
  const cached = riskManager.getMetadata(videoId);
  if (cached) {
    return cached;
  }

  // B站接口支持 bvid 或 aid，我们在这里提取前缀统一使用
  const isAv = videoId.toLowerCase().startsWith("av");
  const paramName = isAv ? "aid" : "bvid";
  const paramVal = isAv ? videoId.slice(2) : videoId;

  const endpoint = `https://api.bilibili.com/x/web-interface/view?${paramName}=${encodeURIComponent(paramVal)}`;

  try {
    const rawData = await fetchJsonWithTimeout<unknown>(endpoint, {
      timeoutMs: 8000,
      service: "Bilibili Web View API",
      headers: riskManager.getHeaders() // 注入轮询与防爬 headers
    });

    const parsed = BilibiliViewApiSchema.parse(rawData);

    if (parsed.code !== 0) {
      throw new Error(`B站接口返回异常码: ${parsed.code}, message: ${parsed.message}`);
    }

    const { bvid, title, owner, pic, desc, cid, duration } = parsed.data;

    // B站图片链接一般为 http 协议开头，我们需要统一映射为规范 structure
    const watchUrl = buildBilibiliWatchUrl(bvid);
    const thumbnailUrl = pic.startsWith("//") ? `https:${pic}` : pic;

    const metadata = VideoMetadataSchema.parse({
      videoId: bvid,
      title: title,
      authorName: owner.name,
      thumbnailUrl: thumbnailUrl,
      providerUrl: watchUrl
    });

    const result = {
      ...metadata,
      description: desc ?? "",
      cid: cid,
      duration: duration
    };

    // 写入内存缓存
    riskManager.setMetadata(videoId, result);

    return result;
  } catch (error) {
    console.error(`[Bilibili:Metadata] 抓取元数据失败 videoId=${videoId}:`, error);
    throw new Error(`无法获取B站视频元数据: ${error instanceof Error ? error.message : String(error)}`);
  }
}
