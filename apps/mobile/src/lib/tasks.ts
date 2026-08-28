import { storage } from "@/lib/storage";

export interface ParsingTask {
  id: string;
  title: string;
  status: "uploading" | "parsing" | "completed" | "failed";
  progress: number; // 0 to 100
  errorMessage?: string;
  createdAt: string;
}

const STORAGE_KEY = "settings:parsing-tasks";

export function getParsingTasks(): ParsingTask[] {
  return storage.get<ParsingTask[]>(STORAGE_KEY, []);
}

export function addParsingTask(id: string, title: string, initialStatus: ParsingTask["status"] = "parsing", initialProgress = 10) {
  const tasks = getParsingTasks();
  // Avoid duplicate tasks
  if (tasks.some(t => t.id === id)) {
    updateParsingTask(id, { status: initialStatus, progress: initialProgress });
    return;
  }

  const newTask: ParsingTask = {
    id,
    title,
    status: initialStatus,
    progress: initialProgress,
    createdAt: new Date().toISOString(),
  };

  storage.set(STORAGE_KEY, [newTask, ...tasks]);
}

export function updateParsingTask(id: string, updates: Partial<Omit<ParsingTask, "id" | "createdAt">>) {
  const tasks = getParsingTasks();
  const updated = tasks.map(task => {
    if (task.id === id) {
      return { ...task, ...updates };
    }
    return task;
  });
  storage.set(STORAGE_KEY, updated);
}

export function removeParsingTask(id: string) {
  const tasks = getParsingTasks();
  storage.set(STORAGE_KEY, tasks.filter(t => t.id !== id));
}

export function clearFinishedTasks() {
  const tasks = getParsingTasks();
  storage.set(STORAGE_KEY, tasks.filter(t => t.status === "uploading" || t.status === "parsing"));
}

export function clearAllTasks() {
  storage.remove(STORAGE_KEY);
}
