import { randomUUID } from "node:crypto";
import { getAsrConfiguration, AsrConfigurationError } from "@/lib/asr/client";
import { createMediaStorageKey, deleteTransientMedia, mediaExtensionFor, writeTransientMedia } from "@/lib/asr/media-storage";
import { AuthorizedMediaAsrTaskInputSchema } from "@/lib/asr/media-task";
import { BilibiliVideoIdSchema } from "@/lib/bilibili/id";
import { createTask, updateTask } from "@/lib/async/task-manager";
import { checkAnalysisQuota, getAuthenticatedUserId, recordAnalysisUsage } from "@/lib/supabase/quota";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, successResponse } from "@/lib/utils/api";

const MAX_MEDIA_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    skipBodySize: true,
    scope: "bilibili-authorized-media",
    rateLimit: { maxRequests: 4, windowMs: 60_000 },
  }).wrap(request, async () => {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return errorResponse("unauthorized", "登录后才能上传本人或获授权媒体。", 401);

    try {
      getAsrConfiguration();
    } catch (error) {
      if (error instanceof AsrConfigurationError) {
        return errorResponse("asr_not_configured", "媒体转写服务暂不可用，请稍后再试。", 503);
      }
      throw error;
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_BYTES + 64 * 1024) {
      return errorResponse("file_too_large", "媒体文件不能超过 200MB。", 413);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const sourceVideoId = BilibiliVideoIdSchema.safeParse(String(formData.get("sourceVideoId") ?? "").trim());
    const title = String(formData.get("title") ?? "").trim();
    const duration = Number(formData.get("duration") ?? 0);
    if (!(file instanceof File)) return errorResponse("no_file", "请选择本人或获授权的音视频文件。", 400);
    if (!sourceVideoId.success) return errorResponse("invalid_bilibili_video", "请提供有效的 B 站 BV/av 号。", 400);
    if (file.size === 0) return errorResponse("invalid_media", "媒体文件为空。", 400);
    if (file.size > MAX_MEDIA_BYTES) return errorResponse("file_too_large", "媒体文件不能超过 200MB。", 413);
    const extension = mediaExtensionFor(file.type);
    if (!extension) return errorResponse("unsupported_media", "仅支持 MP4、WebM、MP3、M4A 和 WAV。", 415);

    const input = AuthorizedMediaAsrTaskInputSchema.safeParse({
      storageKey: createMediaStorageKey(extension),
      contentType: file.type,
      duration,
      title: title || `B 站视频 ${sourceVideoId.data}`,
      sourceVideoId: sourceVideoId.data,
    });
    if (!input.success) return errorResponse("invalid_input", "请提供 1 秒至 2 小时的视频时长。", 400);

    const quota = await checkAnalysisQuota(userId, request);
    if (!quota.allowed) return errorResponse("quota_exceeded", "已达到当前套餐的学习材料导入额度。", 402);

    const videoId = `bili_${randomUUID()}`;
    try {
      await writeTransientMedia(input.data.storageKey, new Uint8Array(await file.arrayBuffer()));
      const taskId = await createTask("authorized_media_asr", videoId, userId, input.data);
      const usage = await recordAnalysisUsage({ userId, videoId, request });
      if (!usage.recorded) {
        try {
          await updateTask(taskId, "failed", undefined, "quota_exceeded");
        } finally {
          await deleteTransientMedia(input.data.storageKey);
        }
        return errorResponse("quota_exceeded", "已达到当前套餐的学习材料导入额度。", 402);
      }
      return successResponse({ taskId, videoId, status: "pending" }, { status: 202 });
    } catch (error) {
      await deleteTransientMedia(input.data.storageKey).catch(() => undefined);
      console.error("[Bilibili:AuthorizedMedia] task creation failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
      return errorResponse("media_queue_failed", "媒体转写任务未能创建，请稍后重试。", 502);
    }
  });
}
