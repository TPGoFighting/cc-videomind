import { randomUUID } from "node:crypto";
import { getAsrConfiguration, AsrConfigurationError } from "@/lib/asr/client";
import { createMediaStorageKey, deleteTransientMedia, mediaExtensionFor, writeTransientMedia } from "@/lib/asr/media-storage";
import { AuthorizedMediaAsrTaskInputSchema } from "@/lib/asr/media-task";
import { BilibiliVideoIdSchema } from "@/lib/bilibili/id";
import { consumeCaptureTicket, parseCaptureTicket } from "@/lib/extension/capture-ticket";
import { createTask, updateTask } from "@/lib/async/task-manager";
import { recordAnalysisUsage } from "@/lib/supabase/quota";
import { withSecurity } from "@/lib/security/middleware";
import { errorResponse, successResponse } from "@/lib/utils/api";

const MAX_MEDIA_BYTES = 200 * 1024 * 1024;

/** Receives audio captured locally by the user's installed Chrome extension. */
export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    skipCsrf: true,
    skipBodySize: true,
    scope: "extension-capture-upload",
    rateLimit: { maxRequests: 4, windowMs: 60_000 },
  }).wrap(request, async () => {
    const ticket = parseCaptureTicket(request.headers.get("x-teach-player-capture-ticket"));
    if (!ticket) return errorResponse("invalid_capture_ticket", "浏览器转写凭证无效或已过期。", 401);

    try {
      getAsrConfiguration();
    } catch (error) {
      if (error instanceof AsrConfigurationError) return errorResponse("asr_not_configured", "媒体转写服务暂不可用，请稍后再试。", 503);
      throw error;
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_BYTES + 64 * 1024) {
      return errorResponse("file_too_large", "媒体文件不能超过 200MB。", 413);
    }

    const formData = await request.formData() as unknown as { get(name: string): string | File | null };
    const file = formData.get("file");
    const sourceVideo = BilibiliVideoIdSchema.safeParse(String(formData.get("sourceVideoId") ?? "").trim());
    const duration = Number(formData.get("duration") ?? 0);
    if (!(file instanceof File)) return errorResponse("no_file", "未收到浏览器采集的音频。", 400);
    if (!sourceVideo.success) return errorResponse("invalid_bilibili_video", "请提供有效的 B 站 BV/av 号。", 400);
    if (file.size === 0) return errorResponse("invalid_media", "采集的音频为空。", 400);
    if (file.size > MAX_MEDIA_BYTES) return errorResponse("file_too_large", "媒体文件不能超过 200MB。", 413);

    const extension = mediaExtensionFor(file.type);
    if (!extension) return errorResponse("unsupported_media", "浏览器采集的音频格式不受支持。", 415);
    const input = AuthorizedMediaAsrTaskInputSchema.safeParse({
      storageKey: createMediaStorageKey(extension),
      contentType: file.type,
      duration,
      title: `B站视频 ${sourceVideo.data}`,
      sourceVideoId: sourceVideo.data,
    });
    if (!input.success) return errorResponse("invalid_input", "请采集 1 秒至 2 小时的媒体。", 400);

    const userId = await consumeCaptureTicket(ticket, sourceVideo.data);
    if (!userId) return errorResponse("invalid_capture_ticket", "浏览器转写凭证无效、已使用或已过期。", 401);

    const videoId = `bili_${randomUUID()}`;
    try {
      await writeTransientMedia(input.data.storageKey, new Uint8Array(await file.arrayBuffer()));
      const taskId = await createTask("authorized_media_asr", videoId, userId, input.data);
      const usage = await recordAnalysisUsage({ userId, videoId });
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
      console.error("[Extension:CaptureUpload] task creation failed", { errorType: error instanceof Error ? error.name : "UnknownError" });
      return errorResponse("media_queue_failed", "浏览器转写任务未能创建，请稍后重试。", 502);
    }
  });
}
