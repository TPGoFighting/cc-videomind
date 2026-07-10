import { getDb, persist, closeDb } from "./sqlite";
import type { SqlValue } from "./sqlite";
import type { AsyncTask, TaskStatus, TaskType } from "@/lib/async/task-manager";
import type { TranscriptSegment } from "@/lib/types";

export type { AsyncTask, TaskStatus, TaskType };

function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

async function run(sql: string, params: SqlValue[] = []): Promise<void> {
  const database = await getDb();
  const stmt = database.prepare(sql);
  try {
    stmt.bind(params);
    while (stmt.step()) {
      // drain: INSERT/UPDATE/DELETE produce no rows
    }
  } finally {
    stmt.free();
  }
  await persist();
}

async function queryRows<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
  const database = await getDb();
  const stmt = database.prepare(sql);
  try {
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

async function safeRead<T>(op: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await op();
  } catch (err) {
    console.error("[local-store] read failed, returning default:", err);
    return fallback;
  }
}

function mutate(opName: string, sql: string, params: SqlValue[] = []): Promise<void> {
  return run(sql, params).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[local-store] ${opName} failed: ${msg}`);
  });
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// analysis + history
// ---------------------------------------------------------------------------

export interface VideoMetadata {
  title?: string | null;
  thumbnailUrl?: string | null;
  authorName?: string | null;
  [key: string]: unknown;
}

export interface AnalysisRecord {
  videoId: string;
  metadata: VideoMetadata | null;
  transcript: TranscriptSegment[] | null;
  analysis: unknown | null;
  createdAt: string;
}

export interface HistoryEntry {
  videoId: string;
  title: string | null;
  author: string | null;
  thumbnail: string | null;
  createdAt: string;
}

export async function saveAnalysis(
  videoId: string,
  metadata: VideoMetadata | null,
  transcript: TranscriptSegment[] | null,
  analysis: unknown | null,
): Promise<void> {
  const ts = nowIso();
  await mutate(
    "saveAnalysis",
    `INSERT OR REPLACE INTO analysis (video_id, metadata, transcript, analysis, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      videoId,
      JSON.stringify(metadata ?? {}),
      JSON.stringify(transcript ?? []),
      JSON.stringify(analysis ?? {}),
      ts,
    ],
  );

  await mutate(
    "saveAnalysis/history",
    `INSERT OR REPLACE INTO history (video_id, title, author, thumbnail, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      videoId,
      metadata?.title ?? null,
      metadata?.authorName ?? null,
      metadata?.thumbnailUrl ?? null,
      ts,
    ],
  );
}

export function getAnalysis(videoId: string): Promise<AnalysisRecord | null> {
  return safeRead(async () => {
    const rows = await queryRows<{
      video_id: string;
      metadata: string | null;
      transcript: string | null;
      analysis: string | null;
      created_at: string;
    }>(`SELECT * FROM analysis WHERE video_id = ?`, [videoId]);
    const row = rows[0];
    if (!row) return null;
    return {
      videoId: row.video_id,
      metadata: parseJson<VideoMetadata | null>(row.metadata, null),
      transcript: parseJson<TranscriptSegment[] | null>(row.transcript, null),
      analysis: parseJson<unknown | null>(row.analysis, null),
      createdAt: row.created_at,
    };
  }, null);
}

export function listHistory(limit = 50): Promise<HistoryEntry[]> {
  return safeRead(async () => {
    const rows = await queryRows<{
      video_id: string;
      title: string | null;
      author: string | null;
      thumbnail: string | null;
      created_at: string;
    }>(
      `SELECT video_id, title, author, thumbnail, created_at
       FROM history ORDER BY created_at DESC LIMIT ?`,
      [limit],
    );
    return rows.map((r) => ({
      videoId: r.video_id,
      title: r.title,
      author: r.author,
      thumbnail: r.thumbnail,
      createdAt: r.created_at,
    }));
  }, []);
}

// ---------------------------------------------------------------------------
// translation versions
// ---------------------------------------------------------------------------

export interface TranslationVersion {
  id: string;
  videoId: string;
  language: string;
  version: number;
  segments: TranscriptSegment[];
  provider: string | null;
  model: string | null;
  qualityScore: number | null;
  createdAt: string;
}

export async function saveTranslationVersion(
  videoId: string,
  language: string,
  segments: TranscriptSegment[],
  opts?: { provider?: string; model?: string; qualityScore?: number },
): Promise<number> {
  const existing = await queryRows<{ version: number }>(
    `SELECT version FROM video_translations
     WHERE video_id = ? AND language = ? ORDER BY version DESC LIMIT 1`,
    [videoId, language],
  );
  const nextVersion = (existing[0]?.version ?? 0) + 1;

  await mutate(
    "saveTranslationVersion",
    `INSERT INTO video_translations
       (id, video_id, language, version, segments, provider, model, quality_score, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newId(),
      videoId,
      language,
      nextVersion,
      JSON.stringify(segments),
      opts?.provider ?? null,
      opts?.model ?? null,
      opts?.qualityScore ?? null,
      nowIso(),
    ],
  );
  return nextVersion;
}

export function getTranslationVersions(
  videoId: string,
  language?: string,
): Promise<TranslationVersion[]> {
  return safeRead(async () => {
    const sql = language
      ? `SELECT * FROM video_translations WHERE video_id = ? AND language = ? ORDER BY version DESC`
      : `SELECT * FROM video_translations WHERE video_id = ? ORDER BY created_at DESC`;
    const params: SqlValue[] = language ? [videoId, language] : [videoId];
    const rows = await queryRows<{
      id: string;
      video_id: string;
      language: string;
      version: number;
      segments: string;
      provider: string | null;
      model: string | null;
      quality_score: number | null;
      created_at: string;
    }>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      videoId: r.video_id,
      language: r.language,
      version: r.version,
      segments: parseJson<TranscriptSegment[]>(r.segments, []),
      provider: r.provider,
      model: r.model,
      qualityScore: r.quality_score,
      createdAt: r.created_at,
    }));
  }, []);
}

export function getLatestTranslation(
  videoId: string,
  language: string,
): Promise<TranslationVersion | null> {
  return safeRead(async () => {
    const versions = await getTranslationVersions(videoId, language);
    return versions[0] ?? null;
  }, null);
}

// ---------------------------------------------------------------------------
// vector chunks (RAG) — cosine computed in JS, embedding stored as JSON array
// ---------------------------------------------------------------------------

export interface StoredChunk {
  id: string;
  chunkIndex: number;
  segmentStart: number;
  segmentEnd: number;
  text: string;
  similarity?: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function upsertChunk(
  videoId: string,
  index: number,
  text: string,
  embedding: number[],
): Promise<void> {
  const existing = await queryRows<{ id: string }>(
    `SELECT id FROM video_chunks WHERE video_id = ? AND chunk_index = ?`,
    [videoId, index],
  );
  const id = existing[0]?.id ?? newId();
  await mutate(
    "upsertChunk",
    `INSERT OR REPLACE INTO video_chunks
       (id, video_id, chunk_index, segment_start, segment_end, text, embedding, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      videoId,
      index,
      0,
      0,
      text,
      JSON.stringify(embedding),
      nowIso(),
    ],
  );
}

export function queryChunks(
  videoId: string,
  vector: number[],
  topK = 5,
): Promise<StoredChunk[]> {
  return safeRead(async () => {
    const rows = await queryRows<{
      id: string;
      chunk_index: number;
      segment_start: number;
      segment_end: number;
      text: string;
      embedding: string | null;
    }>(
      `SELECT id, chunk_index, segment_start, segment_end, text, embedding
       FROM video_chunks WHERE video_id = ? ORDER BY chunk_index ASC`,
      [videoId],
    );
    const scored = rows.map((r) => {
      const emb = parseJson<number[]>(r.embedding, []);
      return {
        id: r.id,
        chunkIndex: r.chunk_index,
        segmentStart: r.segment_start,
        segmentEnd: r.segment_end,
        text: r.text,
        similarity: cosineSimilarity(vector, emb),
      };
    });
    scored.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
    return scored.slice(0, topK);
  }, []);
}

export function getChunksByVideo(videoId: string): Promise<StoredChunk[]> {
  return safeRead(async () => {
    const rows = await queryRows<{
      id: string;
      chunk_index: number;
      segment_start: number;
      segment_end: number;
      text: string;
    }>(
      `SELECT id, chunk_index, segment_start, segment_end, text
       FROM video_chunks WHERE video_id = ? ORDER BY chunk_index ASC`,
      [videoId],
    );
    return rows.map((r) => ({
      id: r.id,
      chunkIndex: r.chunk_index,
      segmentStart: r.segment_start,
      segmentEnd: r.segment_end,
      text: r.text,
    }));
  }, []);
}

export async function deleteChunksByVideo(videoId: string): Promise<void> {
  await mutate(
    "deleteChunksByVideo",
    `DELETE FROM video_chunks WHERE video_id = ?`,
    [videoId],
  );
}

// ---------------------------------------------------------------------------
// user vocabulary (local, single-user)
// ---------------------------------------------------------------------------

export interface VocabularyItem {
  word: string;
  videoId: string;
  definitionZh?: string | null;
  definitionEn?: string | null;
  phonetic?: string | null;
  partOfSpeech?: string | null;
  exampleEn?: string | null;
  exampleZh?: string | null;
}

export interface VocabularyEntry extends VocabularyItem {
  id: string;
  createdAt: string;
}

export async function saveVocabulary(items: VocabularyItem[]): Promise<void> {
  for (const item of items) {
    const existing = await queryRows<{ id: string }>(
      `SELECT id FROM user_vocabulary WHERE word = ?`,
      [item.word],
    );
    const id = existing[0]?.id ?? newId();
    await mutate(
      "saveVocabulary",
      `INSERT OR REPLACE INTO user_vocabulary
         (id, word, video_id, definition_zh, definition_en, phonetic, part_of_speech, example_en, example_zh, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.word,
        item.videoId,
        item.definitionZh ?? null,
        item.definitionEn ?? null,
        item.phonetic ?? null,
        item.partOfSpeech ?? null,
        item.exampleEn ?? null,
        item.exampleZh ?? null,
        nowIso(),
      ],
    );
  }
}

export function loadVocabulary(): Promise<VocabularyEntry[]> {
  return safeRead(async () => {
    const rows = await queryRows<{
      id: string;
      word: string;
      video_id: string;
      definition_zh: string | null;
      definition_en: string | null;
      phonetic: string | null;
      part_of_speech: string | null;
      example_en: string | null;
      example_zh: string | null;
      created_at: string;
    }>(`SELECT * FROM user_vocabulary ORDER BY created_at DESC`);
    return rows.map((r) => ({
      id: r.id,
      word: r.word,
      videoId: r.video_id,
      definitionZh: r.definition_zh,
      definitionEn: r.definition_en,
      phonetic: r.phonetic,
      partOfSpeech: r.part_of_speech,
      exampleEn: r.example_en,
      exampleZh: r.example_zh,
      createdAt: r.created_at,
    }));
  }, []);
}

// ---------------------------------------------------------------------------
// notes
// ---------------------------------------------------------------------------

export interface NoteInput {
  videoId: string;
  body: string;
  timestampSeconds?: number | null;
  videoTitle?: string | null;
}

export interface NoteEntry extends NoteInput {
  id: string;
  createdAt: string;
}

export async function saveNote(input: NoteInput): Promise<string> {
  const id = newId();
  await mutate(
    "saveNote",
    `INSERT INTO notes (id, video_id, body, timestamp_seconds, video_title, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.videoId,
      input.body,
      input.timestampSeconds ?? null,
      input.videoTitle ?? null,
      nowIso(),
    ],
  );
  return id;
}

export function getNotes(videoId?: string): Promise<NoteEntry[]> {
  return safeRead(async () => {
    const sql = videoId
      ? `SELECT * FROM notes WHERE video_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM notes ORDER BY created_at DESC`;
    const rows = await queryRows<{
      id: string;
      video_id: string;
      body: string;
      timestamp_seconds: number | null;
      video_title: string | null;
      created_at: string;
    }>(sql, videoId ? [videoId] : []);
    return rows.map((r) => ({
      id: r.id,
      videoId: r.video_id,
      body: r.body,
      timestampSeconds: r.timestamp_seconds,
      videoTitle: r.video_title,
      createdAt: r.created_at,
    }));
  }, []);
}

export async function deleteNote(id: string): Promise<void> {
  await mutate("deleteNote", `DELETE FROM notes WHERE id = ?`, [id]);
}

// ---------------------------------------------------------------------------
// async tasks (mirrors lib/async/task-manager.ts, local-backed)
// ---------------------------------------------------------------------------

export async function createTask(
  type: TaskType,
  videoId: string,
  userId: string | null,
  input?: Record<string, unknown>,
): Promise<string> {
  const id = newId();
  await mutate(
    "createTask",
    `INSERT INTO async_tasks (id, task_type, video_id, user_id, status, input, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    [
      id,
      type,
      videoId,
      userId,
      input ? JSON.stringify(input) : null,
      nowIso(),
    ],
  );
  return id;
}

export async function updateTask(
  taskId: string,
  status: TaskStatus,
  output?: Record<string, unknown>,
  error?: string,
): Promise<void> {
  const sets: string[] = ["status = ?"];
  const params: SqlValue[] = [status];
  if (status === "running") sets.push("started_at = ?");
  if (status === "completed" || status === "failed") sets.push("completed_at = ?");
  if (status === "running" || status === "completed" || status === "failed") {
    params.push(nowIso());
  }
  if (output !== undefined) {
    sets.push("output = ?");
    params.push(JSON.stringify(output));
  }
  if (error !== undefined) {
    sets.push("error = ?");
    params.push(error);
  }
  params.push(taskId);
  await mutate(
    "updateTask",
    `UPDATE async_tasks SET ${sets.join(", ")} WHERE id = ?`,
    params,
  );
}

export function getTask(taskId: string): Promise<AsyncTask | null> {
  return safeRead(async () => {
    const rows = await queryRows<RawTask>(`SELECT * FROM async_tasks WHERE id = ?`, [
      taskId,
    ]);
    return rows[0] ? toAsyncTask(rows[0]) : null;
  }, null);
}

export function getTasksByVideo(videoId: string): Promise<AsyncTask[]> {
  return safeRead(async () => {
    const rows = await queryRows<RawTask>(
      `SELECT * FROM async_tasks WHERE video_id = ? ORDER BY created_at DESC`,
      [videoId],
    );
    return rows.map(toAsyncTask);
  }, []);
}

export function getPendingTasks(taskType?: TaskType): Promise<AsyncTask[]> {
  return safeRead(async () => {
    const sql = taskType
      ? `SELECT * FROM async_tasks WHERE status = 'pending' AND task_type = ? ORDER BY created_at ASC`
      : `SELECT * FROM async_tasks WHERE status = 'pending' ORDER BY created_at ASC`;
    const rows = await queryRows<RawTask>(sql, taskType ? [taskType] : []);
    return rows.map(toAsyncTask);
  }, []);
}

interface RawTask {
  id: string;
  task_type: string;
  video_id: string;
  user_id: string | null;
  status: string;
  input: string | null;
  output: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

function toAsyncTask(r: RawTask): AsyncTask {
  return {
    id: r.id,
    task_type: r.task_type as TaskType,
    video_id: r.video_id,
    user_id: r.user_id,
    status: r.status as TaskStatus,
    input: parseJson<Record<string, unknown> | null>(r.input, null),
    output: parseJson<Record<string, unknown> | null>(r.output, null),
    error: r.error,
    created_at: r.created_at,
    started_at: r.started_at,
    completed_at: r.completed_at,
  };
}

export { closeDb };
