import { withSecurity } from "@/lib/security/middleware";
import { getTask } from "@/lib/async/task-manager";
import { errorResponse, successResponse } from "@/lib/utils/api";
import { getAuthenticatedUser } from "@/lib/supabase/quota";

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
    const viewer = await getAuthenticatedUser(_request);
    if (task.user_id && viewer?.id !== task.user_id && viewer?.role !== "admin") {
      return errorResponse("forbidden", "You cannot access this task.", 403);
    }

    return successResponse({
      id: task.id,
      taskType: task.task_type,
      videoId: task.video_id,
      status: task.status,
      output: task.user_id ? task.output : null,
      errorCode: task.status === "failed" ? "task_failed" : null,
      createdAt: task.created_at,
      startedAt: task.started_at,
      completedAt: task.completed_at,
    });
  });
}
