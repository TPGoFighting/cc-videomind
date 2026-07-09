import { withSecurity } from "@/lib/security/middleware";
import { getTask } from "@/lib/async/task-manager";
import { errorResponse, successResponse } from "@/lib/utils/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  return withSecurity({
    allowedMethods: ["GET"],
    scope: "tasks",
    skipCsrf: true,
  }).wrap(_request, async () => {
    const { taskId } = await params;
    const task = await getTask(taskId);
    if (!task) return errorResponse("task_not_found", "Task not found.", 404);

    return successResponse({
      id: task.id,
      taskType: task.task_type,
      videoId: task.video_id,
      status: task.status,
      input: task.input,
      output: task.output,
      error: task.error,
      createdAt: task.created_at,
      startedAt: task.started_at,
      completedAt: task.completed_at,
    });
  });
}
