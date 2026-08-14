import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { claimNextPendingTask, claimPendingTask, updateTask, type AsyncTask } from "@/lib/async/task-manager";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";
import { hasWorkerAuthorization } from "@/lib/security/worker-authorization";
import { getAsrConfiguration, requestAsrTranscript } from "@/lib/asr/client";
import { deleteTransientMedia, readTransientMedia } from "@/lib/asr/media-storage";
import { AuthorizedMediaAsrTaskInputSchema } from "@/lib/asr/media-task";
import { transcriptFromAsrResponse } from "@/lib/asr/transcript";
import { buildBilibiliWatchUrl } from "@/lib/bilibili/id";
import { upsertTranscriptCache } from "@/lib/supabase/cache";

const RequestSchema = z.object({ taskId: z.string().uuid().optional() }).default({});
export const maxDuration = 300;

type TaskHandler = (task: AsyncTask) => Promise<Record<string, unknown>>;

const handlers: Record<string, TaskHandler> = {
  vectorize: async () => {
    // Stub — will implement with RAG module
    return { status: "vectorize stub completed" };
  },
  bilibili_asr: async () => {
    throw new Error("Legacy Bilibili audio extraction is disabled. Use authorized_media_asr instead.");
  },
  authorized_media_asr: async (task) => {
    const input = AuthorizedMediaAsrTaskInputSchema.parse(task.input);
    try {
      const media = await readTransientMedia(input.storageKey);
      const response = await requestAsrTranscript(getAsrConfiguration(), {
        file: new Blob([new Uint8Array(media)], { type: input.contentType }),
        filename: `media.${input.storageKey.split(".").at(-1)}`,
      });
      const transcript = transcriptFromAsrResponse(response, input.duration);
      await upsertTranscriptCache({
        videoId: task.video_id,
        metadata: {
          videoId: task.video_id,
          title: input.title,
          authorName: "B站 · 本人或获授权媒体转写",
          providerUrl: buildBilibiliWatchUrl(input.sourceVideoId),
        },
        transcript,
      });
      return { segmentCount: transcript.length, source: "authorized_media_asr" };
    } finally {
      await deleteTransientMedia(input.storageKey);
    }
  },
  comprehensive_analysis: async () => {
    // Stub — will implement with summary module
    return { status: "comprehensive_analysis stub completed" };
  },
};

export async function POST(request: Request) {
  return withSecurity({
    allowedMethods: ["POST"],
    maxBodySize: 4096,
    scope: "worker",
    skipCsrf: true,
  }).wrap(request, async () => {
    if (!hasWorkerAuthorization(request, process.env.ASYNC_TASK_WORKER_SECRET)) {
      return errorResponse("forbidden", "Worker authorization failed.", 403);
    }
    const parsed = await readJson(request, RequestSchema);
    if (!parsed.ok) return parsed.response;

    const taskId = parsed.data?.taskId;
    const task = taskId
      ? await claimPendingTask(taskId)
      : await claimNextPendingTask("authorized_media_asr");
    if (!task) {
      return taskId
        ? errorResponse("task_not_pending", "Task is already running, completed, failed, or missing.", 409)
        : successResponse({ status: "idle" });
    }

    const handler = handlers[task.task_type];
    if (!handler) {
      return errorResponse("unsupported_task_type", `Unknown task type: ${task.task_type}`, 400);
    }

    try {
      const output = await handler(task);
      await updateTask(task.id, "completed", output);
      return successResponse({ taskId: task.id, status: "completed", output });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateTask(task.id, "failed", undefined, message);
      return errorResponse("task_failed", message, 500);
    }
  });
}
