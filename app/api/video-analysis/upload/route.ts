import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { getAiProvider } from "@/lib/ai/provider";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";
import { upsertAnalysisCache } from "@/lib/supabase/cache";
import { getAuthenticatedUserId, checkAnalysisQuota, recordAnalysisUsage } from "@/lib/supabase/quota";
import { errorResponse, successResponse } from "@/lib/utils/api";
import type { TranscriptSegment } from "@/lib/types";

export const maxDuration = 300;

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
  const rateLimit = checkRateLimit(getClientKey(request, "video-analysis-upload"), 8, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("rate_limited", "Too many analysis requests. Try again shortly.", 429);
  }

  const userId = await getAuthenticatedUserId(request);
  const quota = await checkAnalysisQuota(userId, request);
  if (!quota.allowed) {
    const msg = quota.anonymous
      ? "未登录仅限解析1条视频，请登录后继续使用。"
      : "已达到会员每日/周解析限制，请升级配额。";
    return errorResponse("quota_exceeded", msg, 402);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const durationStr = formData.get("duration") as string | null;
    const titleStr = formData.get("title") as string | null;

    if (!file) {
      return errorResponse("no_file", "未检测到上传的文件", 400);
    }

    const duration = durationStr ? parseFloat(durationStr) : 60;
    const originalTitle = titleStr || file.name || "本地视频";
    
    // 生成唯一的 local ID
    const cleanId = Math.random().toString(36).substring(2, 10);
    const videoId = `local-${cleanId}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 确保 uploads 文件夹存在并保存文件
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }
    const savePath = path.join(uploadsDir, `${cleanId}.mp4`);
    writeFileSync(savePath, buffer);

    console.log(`[Upload-Analysis] 保存文件成功: ${savePath}, 大小: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    // 调用 SiliconFlow 语音转录 API
    const asrKey = process.env.ASR_API_KEY || "sk-krxpgqugagzblmuhkkkznmfzduqxiuydobctpyslhcdbhnio";
    const asrBaseUrl = process.env.ASR_API_BASE_URL || "https://api.siliconflow.cn/v1";
    const asrModel = process.env.ASR_MODEL || "FunAudioLLM/SenseVoiceSmall";

    console.log(`[Upload-Analysis] 正在调用 ASR API (${asrModel})...`);

    const sfFormData = new FormData();
    const audioBlob = new Blob([buffer], { type: file.type || "audio/mp4" });
    sfFormData.append("file", audioBlob, file.name || "audio.m4a");
    sfFormData.append("model", asrModel);

    const asrResponse = await fetch(`${asrBaseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${asrKey}`
      },
      body: sfFormData
    });

    if (!asrResponse.ok) {
      const errText = await asrResponse.text().catch(() => "");
      console.error(`[Upload-Analysis] ASR API 错误 (HTTP ${asrResponse.status}):`, errText);
      throw new Error(`ASR API 错误: ${errText.slice(0, 200)}`);
    }

    const asrData = await asrResponse.json();
    console.log(`[Upload-Analysis] ASR 转录成功:`, JSON.stringify(asrData).slice(0, 200));

    let transcript: TranscriptSegment[] = [];
    if (asrData && Array.isArray(asrData.segments)) {
      transcript = asrData.segments
        .filter((s: any) => s.text && Number.isFinite(s.start) && Number.isFinite(s.end))
        .map((s: any) => ({
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
      providerUrl: `http://10.0.2.2:3000/api/video-stream?id=${videoId}`
    };

    // 自动翻译文稿逻辑（中文视频译成英文，英文视频译成中文）
    const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);
    const hasTranslation = transcript.some((s) => s.text_zh?.trim());
    let finalTranscript = transcript;

    if (!hasTranslation && transcript.length > 0) {
      try {
        console.log(`[Translate] 启动上传文稿自动翻译逻辑, 视频ID: ${videoId}...`);
        const textSample = transcript.slice(0, 15).map((s) => s.text).join(" ");
        const targetLanguage = containsChinese(textSample) ? "English" : "zh-CN";
        console.log(`[Translate] 语言检测: ${containsChinese(textSample) ? "中文音频 -> 译成英文" : "英文音频 -> 译成中文"}`);
        
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
        console.log(`[Translate] 上传音频自动翻译成功，翻译总段数: ${finalTranscript.length}`);
      } catch (err) {
        console.error(`[Translate] 上传音频自动翻译失败，降级回退到原文字幕:`, err);
      }
    }

    console.log(`[Upload-Analysis] 正在生成 AI 分析...`);
    const analysis = await (await getAiProvider(userId ?? undefined)).generateAnalysis({ title: metadata.title, transcript: finalTranscript });

    // 缓存至 Supabase
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
    console.error("Local video upload & analysis failed", error);
    const message =
      error instanceof Error
        ? `导入分析失败：${error.message}`
        : "Failed to import and analyze the local media file.";
    return errorResponse("analysis_failed", message, 502);
  }
}
