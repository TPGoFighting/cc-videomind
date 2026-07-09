import { z } from "zod";
import { errorResponse, successResponse } from "@/lib/utils/api";
import { extractYouTubeVideoId, VideoIdSchema } from "@/lib/youtube/id";
import { withSecurity } from "@/lib/security/middleware";
import { getCachedAnalysis } from "@/lib/supabase/cache";

const RequestSchema = z.object({
  videoId: z.string().min(1).max(100),
});

/**
 * 快速获取视频元数据（标题、作者、缩略图）
 * 始终在 2-3s 内返回，不触发完整分析管线
 * 如果缓存中有完整分析结果，一并返回 transcript 和 analysis
 */
export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 16 * 1024,
    scope: "video-meta",
    rateLimit: { maxRequests: 30, windowMs: 60_000 },
  }).wrap(request, async () => {
      const parsed = await request.json() as Record<string, unknown>;
  const input = String(parsed.videoId ?? "").trim();
  if (!input) {
    return errorResponse("invalid_input", "videoId is required.", 400);
  }

  const isBilibili = /^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(input);
  let videoId = input;
  let metadata: Record<string, unknown> | null = null;

  // 1. 查询缓存
  const cached = await getCachedAnalysis(videoId);
  if (cached?.metadata) {
    metadata = {
      videoId: cached.metadata.videoId,
      title: cached.metadata.title,
      authorName: cached.metadata.authorName,
      thumbnailUrl: cached.metadata.thumbnailUrl,
      providerUrl: cached.metadata.providerUrl,
    };

    // 缓存中有完整结果 → 一并返回
    if (cached.transcript && cached.analysis) {
      return successResponse({
        videoId,
        metadata,
        transcript: cached.transcript,
        analysis: cached.analysis,
        cached: true,
        preview: false,
      });
    }

    // 只有元数据缓存
    return successResponse({
      videoId,
      metadata,
      transcript: null,
      analysis: null,
      cached: true,
      preview: false,
    });
  }

  // 2. 缓存未命中，实时抓取元数据（不回写缓存，不触发完整分析）
  try {
    if (isBilibili) {
      const { fetchBilibiliMetadata } = await import("@/lib/bilibili/metadata");
      const biliMeta = await fetchBilibiliMetadata(videoId);
      metadata = {
        videoId: biliMeta.videoId,
        title: biliMeta.title,
        authorName: biliMeta.authorName,
        thumbnailUrl: biliMeta.thumbnailUrl,
        providerUrl: biliMeta.providerUrl,
      };
    } else {
      const { fetchYouTubeMetadata } = await import("@/lib/youtube/metadata");
      metadata = await fetchYouTubeMetadata(videoId);
    }
  } catch (error) {
    console.error(`[Meta] 元数据获取失败 videoId=${videoId}:`, error);
    return errorResponse("meta_fetch_failed", "无法获取视频元数据，请检查视频链接是否有效。", 502);
  }

  return successResponse({
    videoId,
    metadata,
    transcript: null,
    analysis: null,
    cached: false,
    preview: false,
  });
});
}
