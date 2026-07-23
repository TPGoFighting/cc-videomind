import { randomUUID } from "node:crypto";
import { getAuthenticatedUserId, checkAnalysisQuota, recordAnalysisUsage } from "@/lib/supabase/quota";
import { upsertTranscriptCache } from "@/lib/supabase/cache";
import { buildBilibiliWatchUrl, BilibiliVideoIdSchema } from "@/lib/bilibili/id";
import { SubtitleImportError, parseSubtitleImport } from "@/lib/bilibili/subtitle-import";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, successResponse } from "@/lib/utils/api";

const MAX_SUBTITLE_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    skipBodySize: true,
    scope: "bilibili-subtitle-import",
    rateLimit: { maxRequests: 8, windowMs: 60_000 },
  }).wrap(request, async () => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return errorResponse("unauthorized", "登录后才能导入 B 站字幕。", 401);
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_SUBTITLE_BYTES + 64 * 1024) {
      return errorResponse("file_too_large", "字幕文件不能超过 2MB。", 413);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const sourceVideoId = String(formData.get("sourceVideoId") ?? "").trim();
    const suppliedTitle = String(formData.get("title") ?? "").trim();
    const sourceParsed = BilibiliVideoIdSchema.safeParse(sourceVideoId);
    if (!sourceParsed.success) {
      return errorResponse("invalid_bilibili_video", "请提供有效的 B 站 BV/av 号。", 400);
    }
    if (!(file instanceof File)) {
      return errorResponse("no_file", "请选择字幕文件。", 400);
    }
    if (!file.name || file.size === 0) {
      return errorResponse("invalid_subtitle", "字幕文件为空。", 400);
    }
    if (file.size > MAX_SUBTITLE_BYTES) {
      return errorResponse("file_too_large", "字幕文件不能超过 2MB。", 413);
    }

    let imported;
    try {
      imported = parseSubtitleImport({ filename: file.name, content: await file.text() });
    } catch (error) {
      if (error instanceof SubtitleImportError) {
        return errorResponse(error.code, error.message, 400);
      }
      return errorResponse("invalid_subtitle", "无法读取该字幕文件。", 400);
    }

    const quota = await checkAnalysisQuota(userId, request);
    if (!quota.allowed) {
      return errorResponse("quota_exceeded", "已达到当前套餐的学习材料导入额度。", 402);
    }

    const videoId = `bili_${randomUUID()}`;
    const usage = await recordAnalysisUsage({ userId, videoId, request });
    if (!usage.recorded) {
      return errorResponse("quota_exceeded", "已达到当前套餐的学习材料导入额度。", 402);
    }

    const title = suppliedTitle.slice(0, 200) || `B 站视频 ${sourceParsed.data}`;
    await upsertTranscriptCache({
      videoId,
      metadata: {
        videoId,
        title,
        authorName: "B站 · 用户导入字幕",
        providerUrl: buildBilibiliWatchUrl(sourceParsed.data),
      },
      transcript: imported.segments,
    });

    return successResponse({
      videoId,
      sourceVideoId: sourceParsed.data,
      sourceFormat: imported.sourceFormat,
      segmentCount: imported.segments.length,
    });
  });
}
