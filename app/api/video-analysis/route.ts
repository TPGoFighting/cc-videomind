import { z } from "zod";
import { getAiProvider } from "@/lib/ai/provider";
import { withSecurity } from "@/lib/security/middleware";
import { getCachedAnalysis, upsertAnalysisCache } from "@/lib/supabase/cache";
import { checkAnalysisQuota, getAuthenticatedUserId, hasUserAnalyzedVideo, recordAnalysisUsage } from "@/lib/supabase/quota";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { extractYouTubeVideoId } from "@/lib/youtube/id";
import { extractBilibiliVideoId, isBilibiliImportedVideoId, isBilibiliVideoId } from "@/lib/bilibili/id";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata";
import { getTranscriptProvider } from "@/lib/youtube/transcript-provider";
import { isLocalMode } from "@/lib/local-mode";

const RequestSchema = z
  .object({
    url: z.string().min(1).max(500).optional(),
    videoId: z.string().min(6).max(64).optional()
  })
  .refine((value) => value.url || value.videoId, "url or videoId is required");

function buildQuotaMessage(quota: {
  tier?: string;
  dailyLimit?: number;
  weeklyLimit?: number;
  dailyUsed?: number;
  weeklyUsed?: number;
  totalLimit?: number;
  totalUsed?: number;
}) {
  const tier = quota.tier ?? "free";

  if (quota.totalLimit !== undefined) {
    return tier === "free"
      ? `免费版总计解析次数已达上限（${quota.totalLimit}次），请升级至 Pro 或 Max 解锁更多配额。`
      : `${tier === "pro" ? "Pro" : "Max"} 当前周期解析次数已达上限（${quota.totalLimit}次）。`;
  }

  const dailyLimit = quota.dailyLimit ?? 10;
  const weeklyLimit = quota.weeklyLimit ?? Infinity;
  const dailyUsed = quota.dailyUsed ?? 0;

  const dailyExceeded = dailyUsed >= dailyLimit;

  const limitDesc = dailyExceeded
    ? `今日已达上限（${dailyLimit}次/天）`
    : `本周已达上限（${weeklyLimit}次/周）`;

  const upgradeHint =
    tier === "pro"
      ? "请升级至 Max 解锁更多配额。"
      : "如需更多配额，请联系技术支持。";

  return `${limitDesc}，${upgradeHint}`;
}

export const maxDuration = 300;

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 64 * 1024,
    scope: "video-analysis",
    rateLimit: { maxRequests: 8, windowMs: 60_000 },
  }).wrap(request, async () => {
      const parsed = await readJson(request, RequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  let videoId = parsed.data.videoId ?? null;
  const urlInput = parsed.data.url?.trim() ?? "";
  let isBilibili = false;

  if (videoId) {
    isBilibili = isBilibiliVideoId(videoId);
  } else if (urlInput) {
    isBilibili =
      urlInput.includes("bilibili.com") ||
      urlInput.includes("b23.tv") ||
      /^(BV[a-zA-Z0-9]{10}|av\d+)$/i.test(urlInput);

    if (isBilibili) {
      videoId = extractBilibiliVideoId(urlInput);
    } else {
      videoId = extractYouTubeVideoId(urlInput);
    }
  }

  if (!videoId) {
    return errorResponse("invalid_video_url", "Enter a valid public YouTube or Bilibili URL.", 400);
  }

  if (isBilibili) {
    return errorResponse(
      "bilibili_subtitle_import_required",
      "B 站视频请先导入 SRT、VTT 或 B 站 JSON 字幕；自动提取公开视频音频已停用。",
      422,
    );
  }

  const userId = await getAuthenticatedUserId(request);
  if (isBilibiliImportedVideoId(videoId) && (!userId || (!isLocalMode() && !await hasUserAnalyzedVideo(userId, videoId, request)))) {
    return errorResponse("workspace_not_found", "找不到这份导入字幕，或你没有访问权限。", 404);
  }
  const cached = await getCachedAnalysis(videoId);

  // 缓存命中：检查当前用户是否已解析过此视频
  if (cached?.metadata && cached.transcript && cached.analysis) {
    const alreadyAnalyzed = await hasUserAnalyzedVideo(userId, videoId, request);
    if (alreadyAnalyzed) {
      return successResponse({
        videoId,
        metadata: cached.metadata,
        transcript: cached.transcript,
        analysis: cached.analysis,
        cached: true,
        preview: false
      });
    }

    // 缓存命中但用户未解析过 → 仍需扣额度
    const quota = await checkAnalysisQuota(userId, request);
    if (!quota.allowed) {
      const msg = quota.anonymous
        ? "未登录仅限解析1条视频，请登录后继续使用。"
        : buildQuotaMessage(quota);
      return errorResponse("quota_exceeded", msg, 402);
    }

    const usage = await recordAnalysisUsage({ userId, videoId, request });
    if (!usage.recorded) return errorResponse("quota_exceeded", buildQuotaMessage(usage.quota ?? quota), 402);

    return successResponse({
      videoId,
      metadata: cached.metadata,
      transcript: cached.transcript,
      analysis: cached.analysis,
      cached: true,
      preview: userId === null
    });
  }

  // 缓存未命中：走完整流程
  const quota = await checkAnalysisQuota(userId, request);
  if (!quota.allowed) {
    const msg = quota.anonymous
      ? "未登录仅限解析1条视频，请登录后继续使用。"
      : buildQuotaMessage(quota);
    return errorResponse("quota_exceeded", msg, 402);
  }

  try {
    // B站工作台只会使用已导入的字幕缓存；未命中时才按 YouTube 流程获取。
    const fetchMeta = async () => {
      if (cached?.metadata) return cached.metadata;
      return fetchYouTubeMetadata(videoId!);
    };

    const fetchTrans = async () => {
      if (cached?.transcript) return cached.transcript;
      return getTranscriptProvider().getTranscript(videoId!);
    };

    const [metadata, transcript] = await Promise.all([fetchMeta(), fetchTrans()]);

    // 自动翻译文稿逻辑（中文视频译成英文，英文视频译成中文）
    const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);
    const hasTranslation = transcript.some((s) => s.text_zh?.trim());
    let finalTranscript = transcript;

    if (!hasTranslation && transcript.length > 0) {
      try {
        console.log(`[Translate] 启动自动翻译文稿逻辑, 视频ID: ${videoId}...`);
        const textSample = transcript.slice(0, 15).map((s) => s.text).join(" ");
        const targetLanguage = containsChinese(textSample) ? "English" : "zh-CN";
        console.log(`[Translate] 语言检测: ${containsChinese(textSample) ? "中文视频 -> 译成英文" : "英文视频 -> 译成中文"}`);
        
        const aiProvider = await getAiProvider(userId ?? undefined);

        // 分批并行翻译（每批 30 句）
        const BATCH_SIZE = 30;
        const chunks = [];
        for (let i = 0; i < transcript.length; i += BATCH_SIZE) {
          chunks.push(transcript.slice(i, i + BATCH_SIZE));
        }

        const translatedChunks = await Promise.all(
          chunks.map((chunk) => aiProvider.translateTranscript({ segments: chunk, targetLanguage }))
        );
        finalTranscript = translatedChunks.flat();
        console.log(`[Translate] 自动翻译成功完成，翻译总段数: ${finalTranscript.length}`);
      } catch (err) {
        console.error(`[Translate] 自动翻译失败，降级回退到原文字幕:`, err);
      }
    }

    const analysis = await (await getAiProvider(userId ?? undefined)).generateAnalysis({ title: metadata.title, transcript: finalTranscript });

    await upsertAnalysisCache({ videoId, metadata, transcript: finalTranscript, analysis });
    const usage = await recordAnalysisUsage({ userId, videoId, request });
    if (!usage.recorded) return errorResponse("quota_exceeded", buildQuotaMessage(usage.quota ?? quota), 402);

    return successResponse({
      videoId,
      metadata,
      transcript: finalTranscript,
      analysis,
      cached: false,
      preview: userId === null
    });
  } catch (error) {
    console.error("Video analysis failed", error);
    const message =
      error instanceof Error
        ? `分析失败：${error.message}`
        : "Video analysis could not be generated from the transcript.";
    return errorResponse("analysis_failed", message, 502);
  }
  });
}
