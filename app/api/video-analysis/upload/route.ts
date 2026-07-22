import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { getAiProvider } from "@/lib/ai/provider";
import {
  AsrConfigurationError,
  AsrServiceError,
  getAsrConfiguration,
  requestAsrTranscript,
} from "@/lib/asr/client";
import { withSecurity } from "@/lib/security/middleware";
import { upsertAnalysisCache } from "@/lib/supabase/cache";
import { getAuthenticatedUserId, checkAnalysisQuota, recordAnalysisUsage } from "@/lib/supabase/quota";
import { errorResponse, successResponse } from "@/lib/utils/api";
import type { TranscriptSegment } from "@/lib/types";

export const maxDuration = 300;
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

function cleanCaptionText(text: string): string {
  return text
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTextIntoProportionalSegments(text: string, totalDuration: number): TranscriptSegment[] {
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

  const segments = [];
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

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    skipBodySize: true,
    scope: "video-analysis-upload",
    rateLimit: { maxRequests: 8, windowMs: 60_000 },
  }).wrap(request, async () => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return errorResponse("unauthorized", "登录后才能上传本地视频。", 401);
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
      return errorResponse("file_too_large", "上传文件不能超过 200MB。", 413);
    }

    const quota = await checkAnalysisQuota(userId, request);
    if (!quota.allowed) {
      const msg = quota.anonymous
        ? "未登录仅限解析1条视频，请登录后继续使用。"
        : "已达到会员每日/周解析限制，请升级配额。";
      return errorResponse("quota_exceeded", msg, 402);
    }

    let asrConfiguration;
    try {
      asrConfiguration = getAsrConfiguration();
    } catch (error) {
      if (error instanceof AsrConfigurationError) {
        console.error("[Upload-Analysis] ASR configuration unavailable");
        return errorResponse(
          "asr_not_configured",
          "本地视频转录服务暂不可用，请稍后再试。",
          503,
        );
      }
      throw error;
    }

    let videoId: string | null = null;
    let savedPath: string | null = null;
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const durationStr = formData.get("duration") as string | null;
      const titleStr = formData.get("title") as string | null;

      if (!file) {
        return errorResponse("no_file", "未检测到上传的文件", 400);
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return errorResponse("file_too_large", "上传文件不能超过 200MB。", 413);
      }

      const duration = durationStr ? parseFloat(durationStr) : 60;
      const originalTitle = titleStr || file.name || "本地视频";

      // 生成唯一的 local ID
      const cleanId = Math.random().toString(36).substring(2, 10);
      videoId = `local-${cleanId}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 确保 uploads 文件夹存在并保存文件
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }
      savedPath = path.join(uploadsDir, `${cleanId}.mp4`);
      writeFileSync(savedPath, buffer);

      console.info("[Upload-Analysis] file saved", {
        videoId,
        sizeBytes: buffer.byteLength,
      });

      console.info("[Upload-Analysis] ASR request started", {
        videoId,
        model: asrConfiguration.model,
      });

      const asrData = await requestAsrTranscript(asrConfiguration, {
        file: new Blob([buffer], { type: file.type || "audio/mp4" }),
        filename: file.name || "audio.m4a",
      });

      console.info("[Upload-Analysis] ASR request completed", {
        videoId,
        segmentCount: asrData.segments?.length ?? 0,
        hasPlainText: Boolean(asrData.text?.trim()),
      });

    let transcript: TranscriptSegment[] = [];
    if (asrData && Array.isArray(asrData.segments)) {
      transcript = asrData.segments
        .filter((s) => s.text && Number.isFinite(s.start) && Number.isFinite(s.end))
        .map((s) => ({
          startTime: Number(s.start),
          endTime: Number(s.end),
          text: cleanCaptionText(String(s.text))
        }));
    } else if (asrData && typeof asrData.text === "string" && asrData.text.trim()) {
      transcript = splitTextIntoProportionalSegments(asrData.text, duration);
    } else {
      throw new Error("ASR 语音转录接口未返回有效的文本");
    }

    // 生成 AI 总结与 moments
    const metadata = {
      videoId,
      title: originalTitle,
      authorName: "本地导入",
      thumbnailUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=320&auto=format&fit=crop&q=60",
      providerUrl: `${(process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "")}/api/video-stream?id=${videoId}`
    };

    // 自动翻译文稿逻辑（中文视频译成英文，英文视频译成中文）
    const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);
    const hasTranslation = transcript.some((s) => s.text_zh?.trim());
    let finalTranscript = transcript;

    if (!hasTranslation && transcript.length > 0) {
      try {
        console.info("[Upload-Analysis] translation started", { videoId });
        const textSample = transcript.slice(0, 15).map((s) => s.text).join(" ");
        const targetLanguage = containsChinese(textSample) ? "English" : "zh-CN";
        console.info("[Upload-Analysis] translation language detected", {
          videoId,
          targetLanguage,
        });
        
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
        console.info("[Upload-Analysis] translation completed", {
          videoId,
          segmentCount: finalTranscript.length,
        });
      } catch (err) {
        console.warn("[Upload-Analysis] translation failed; using source transcript", {
          videoId,
          errorType: err instanceof Error ? err.name : "UnknownError",
        });
      }
    }

    console.info("[Upload-Analysis] analysis started", { videoId });
    const analysis = await (await getAiProvider(userId ?? undefined)).generateAnalysis({ title: metadata.title, transcript: finalTranscript });

    // 缓存至腾讯 PostgreSQL 权威数据库
    await upsertAnalysisCache({ videoId, metadata, transcript: finalTranscript, analysis });
    await recordAnalysisUsage({ userId, videoId, request });

    return successResponse({
      videoId,
      metadata,
      transcript: finalTranscript,
      analysis,
      cached: false,
      preview: userId === null
    });
    } catch (error) {
      if (savedPath && existsSync(savedPath)) {
        try {
          unlinkSync(savedPath);
        } catch {
          console.warn("[Upload-Analysis] failed upload cleanup was not completed", { videoId });
        }
      }
      const errorType = error instanceof Error ? error.name : "UnknownError";
      const asrStatus = error instanceof AsrServiceError ? error.status : undefined;
      console.error("[Upload-Analysis] request failed", {
        videoId,
        errorType,
        asrStatus,
      });

      if (error instanceof AsrServiceError) {
        return errorResponse(
          "asr_failed",
          "语音转录服务暂时不可用，请稍后重试。",
          502,
        );
      }

      return errorResponse(
        "analysis_failed",
        "导入分析失败，请稍后重试。",
        502,
      );
    }
  });
}
