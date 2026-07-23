import { query } from "@/lib/db";
import { isLocalMode } from "@/lib/local-mode";
import * as localStore from "@/lib/db/local-store";

export type TaskType = "bilibili_asr" | "authorized_media_asr" | "translate" | "vectorize" | "comprehensive_analysis";
export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface AsyncTask {
  id: string;
  task_type: TaskType;
  video_id: string;
  user_id: string | null;
  status: TaskStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export async function createTask(
  type: TaskType,
  videoId: string,
  userId: string | null,
  input?: Record<string, unknown>,
): Promise<string> {
  if (isLocalMode()) return localStore.createTask(type, videoId, userId, input);
  const { rows } = await query<{ id: string }>(
    `INSERT INTO async_tasks (task_type, video_id, user_id, input)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [type, videoId, userId, input ? JSON.stringify(input) : null]
  );
  return rows[0].id;
}

export async function updateTask(
  taskId: string,
  status: TaskStatus,
  output?: Record<string, unknown>,
  error?: string,
): Promise<void> {
  if (isLocalMode()) return localStore.updateTask(taskId, status, output, error);
  const sets: string[] = ["status = $1"];
  const params: unknown[] = [status];
  let idx = 2;

  if (status === "running") {
    sets.push(`started_at = NOW()`);
  }
  if (status === "completed" || status === "failed") {
    sets.push(`completed_at = NOW()`);
  }
  if (output !== undefined) {
    sets.push(`output = $${idx++}`);
    params.push(JSON.stringify(output));
  }
  if (error !== undefined) {
    sets.push(`error = $${idx++}`);
    params.push(error);
  }

  params.push(taskId);
  await query(`UPDATE async_tasks SET ${sets.join(", ")} WHERE id = $${idx}`, params);
}

export async function getTask(taskId: string): Promise<AsyncTask | null> {
  if (isLocalMode()) return localStore.getTask(taskId);
  const { rows } = await query<AsyncTask>(
    `SELECT * FROM async_tasks WHERE id = $1`,
    [taskId]
  );
  return rows[0] ?? null;
}

export async function getTasksByVideo(videoId: string): Promise<AsyncTask[]> {
  if (isLocalMode()) return localStore.getTasksByVideo(videoId);
  const { rows } = await query<AsyncTask>(
    `SELECT * FROM async_tasks WHERE video_id = $1 ORDER BY created_at DESC`,
    [videoId]
  );
  return rows;
}

export async function getPendingTasks(taskType?: TaskType): Promise<AsyncTask[]> {
  if (isLocalMode()) return localStore.getPendingTasks(taskType);
  if (taskType) {
    const { rows } = await query<AsyncTask>(
      `SELECT * FROM async_tasks WHERE status = 'pending' AND task_type = $1 ORDER BY created_at ASC`,
      [taskType]
    );
    return rows;
  }
  const { rows } = await query<AsyncTask>(
    `SELECT * FROM async_tasks WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return rows;
}

/**
 * Atomically reserves the oldest pending task of a supported type for one
 * worker. A second scheduler invocation therefore cannot transcribe the same
 * private upload twice.
 */
export async function claimNextPendingTask(taskType: TaskType): Promise<AsyncTask | null> {
  if (isLocalMode()) return localStore.claimNextPendingTask(taskType);
  const { rows } = await query<AsyncTask>(
    `WITH next_task AS (
       SELECT id
       FROM async_tasks
       WHERE status = 'pending' AND task_type = $1
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE async_tasks AS task
     SET status = 'running', started_at = NOW()
     FROM next_task
     WHERE task.id = next_task.id
     RETURNING task.*`,
    [taskType],
  );
  return rows[0] ?? null;
}

export async function claimPendingTask(taskId: string): Promise<AsyncTask | null> {
  if (isLocalMode()) return localStore.claimPendingTask(taskId);
  const { rows } = await query<AsyncTask>(
    `UPDATE async_tasks
     SET status = 'running', started_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [taskId],
  );
  return rows[0] ?? null;
}
