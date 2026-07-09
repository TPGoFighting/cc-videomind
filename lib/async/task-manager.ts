import { createSupabaseServiceClient, createSupabaseServerClient } from "@/lib/supabase/server";

export type TaskType = "bilibili_asr" | "translate" | "vectorize" | "comprehensive_analysis";
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

function getClient() {
  const serviceClient = createSupabaseServiceClient();
  if (serviceClient) return serviceClient;
  // Fallback to server client (requires cookies — works in API routes)
  return null;
}

function requireClient() {
  const client = getClient();
  if (!client) {
    throw new Error("Supabase client is not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }
  return client;
}

export async function createTask(
  type: TaskType,
  videoId: string,
  userId: string | null,
  input?: Record<string, unknown>,
): Promise<string> {
  const client = requireClient();
  const { data, error } = await client
    .from("async_tasks")
    .insert({ task_type: type, video_id: videoId, user_id: userId, input: input ?? null })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data.id as string;
}

export async function updateTask(
  taskId: string,
  status: TaskStatus,
  output?: Record<string, unknown>,
  error?: string,
): Promise<void> {
  const client = requireClient();
  const update: Record<string, unknown> = { status };

  if (status === "running") update.started_at = new Date().toISOString();
  if (status === "completed" || status === "failed") update.completed_at = new Date().toISOString();
  if (output !== undefined) update.output = output;
  if (error !== undefined) update.error = error;

  const { error: updateError } = await client
    .from("async_tasks")
    .update(update)
    .eq("id", taskId);

  if (updateError) throw new Error(`Failed to update task: ${updateError.message}`);
}

export async function getTask(taskId: string): Promise<AsyncTask | null> {
  const client = requireClient();
  const { data, error } = await client
    .from("async_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error) return null;
  return data as AsyncTask;
}

export async function getTasksByVideo(videoId: string): Promise<AsyncTask[]> {
  const client = requireClient();
  const { data, error } = await client
    .from("async_tasks")
    .select("*")
    .eq("video_id", videoId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as AsyncTask[];
}

export async function getPendingTasks(taskType?: TaskType): Promise<AsyncTask[]> {
  const client = requireClient();
  let query = client
    .from("async_tasks")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (taskType) query = query.eq("task_type", taskType);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as AsyncTask[];
}
