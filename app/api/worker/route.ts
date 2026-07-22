import { z } from "zod";
import { withSecurity } from "@/lib/security/middleware";
import { getTask, updateTask, type AsyncTask } from "@/lib/async/task-manager";
import { errorResponse, readJson, successResponse } from "@/lib/utils/api";

const RequestSchema = z.object({ taskId: z.string().uuid() });

type TaskHandler = (task: AsyncTask) => Promise<Record<string, unknown>>;

const handlers: Record<string, TaskHandler> = {
  vectorize: async () => {
    // Stub — will implement with RAG module
    return { status: "vectorize stub completed" };
  },
  bilibili_asr: async () => {
    // Stub — will implement with Bilibili ASR
    return { status: "bilibili_asr stub completed" };
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
    const parsed = await readJson(request, RequestSchema);
    if (!parsed.ok) return parsed.response;

    const { taskId } = parsed.data;

    const task = await getTask(taskId);
    if (!task) return errorResponse("task_not_found", "Task not found.", 404);
    if (task.status !== "pending") {
      return errorResponse("task_not_pending", `Task is already ${task.status}.`, 409);
    }

    const handler = handlers[task.task_type];
    if (!handler) {
      return errorResponse("unsupported_task_type", `Unknown task type: ${task.task_type}`, 400);
    }

    try {
      await updateTask(taskId, "running");
      const output = await handler(task);
      await updateTask(taskId, "completed", output);
      return successResponse({ taskId, status: "completed", output });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateTask(taskId, "failed", undefined, message);
      return errorResponse("task_failed", message, 500);
    }
  });
}
