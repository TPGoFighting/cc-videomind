import { getDb, persist, closeDb } from "./sqlite";
import type { SqlValue } from "./sqlite";
import type { AsyncTask, TaskStatus, TaskType } from "@/lib/async/task-manager";
import type { TranscriptSegment } from "@/lib/types";
import {
  ReviewCadenceSchema,
  type ReviewCadence,
} from "@/lib/product/retention";

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

export function getTranslation(
  videoId: string,
  language: string,
  version: number,
): Promise<TranslationVersion | null> {
  return safeRead(async () => {
    const rows = await getTranslationVersions(videoId, language);
    return rows.find((record) => record.version === version) ?? null;
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
  sourceTime?: number | null;
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
         (id, word, video_id, definition_zh, definition_en, phonetic, part_of_speech, example_en, example_zh, source_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        item.sourceTime ?? null,
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
      source_time: number | null;
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
      sourceTime: r.source_time,
      createdAt: r.created_at,
    }));
  }, []);
}

export async function deleteVocabulary(id: string): Promise<boolean> {
  const entries = await queryRows<{ word: string }>(
    `SELECT word FROM user_vocabulary WHERE id = ?`,
    [id],
  );
  const database = await getDb();
  const before = database.getRowsModified();
  await mutate("deleteVocabulary", `DELETE FROM user_vocabulary WHERE id = ?`, [id]);
  if (entries[0]?.word) {
    await mutate("deleteVocabulary/review", `DELETE FROM user_word_reviews WHERE lemma = ?`, [entries[0].word]);
  }
  return database.getRowsModified() > before;
}

export async function deleteVocabularyByWord(word: string): Promise<void> {
  await mutate("deleteVocabularyByWord", `DELETE FROM user_vocabulary WHERE word = ?`, [word]);
  await mutate("deleteVocabularyByWord/review", `DELETE FROM user_word_reviews WHERE lemma = ?`, [word]);
}

// ---------------------------------------------------------------------------
// SM-2 review state (local, single-user)
// ---------------------------------------------------------------------------

export interface ReviewState {
  lemma: string;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string;
  status: string;
}

export interface ReviewWord extends VocabularyEntry, ReviewState {}

export function getReviewState(lemma: string): Promise<ReviewState | null> {
  return safeRead(async () => {
    const rows = await queryRows<{
      lemma: string;
      repetitions: number;
      ease_factor: number;
      interval_days: number;
      next_review_at: string;
      status: string;
    }>(`SELECT * FROM user_word_reviews WHERE lemma = ?`, [lemma]);
    const row = rows[0];
    return row ? {
      lemma: row.lemma,
      repetitions: row.repetitions,
      easeFactor: row.ease_factor,
      intervalDays: row.interval_days,
      nextReviewAt: row.next_review_at,
      status: row.status,
    } : null;
  }, null);
}

export async function saveReviewState(state: ReviewState): Promise<void> {
  await mutate(
    "saveReviewState",
    `INSERT INTO user_word_reviews
       (lemma, repetitions, ease_factor, interval_days, next_review_at, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(lemma) DO UPDATE SET
       repetitions = excluded.repetitions,
       ease_factor = excluded.ease_factor,
       interval_days = excluded.interval_days,
       next_review_at = excluded.next_review_at,
       status = excluded.status,
       updated_at = excluded.updated_at`,
    [
      state.lemma,
      state.repetitions,
      state.easeFactor,
      state.intervalDays,
      state.nextReviewAt,
      state.status,
      nowIso(),
    ],
  );
}

export function getDueReviewWords(limit = 20): Promise<ReviewWord[]> {
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
      source_time: number | null;
      created_at: string;
      repetitions: number | null;
      ease_factor: number | null;
      interval_days: number | null;
      next_review_at: string | null;
      status: string | null;
    }>(
      `SELECT v.*, r.repetitions, r.ease_factor, r.interval_days, r.next_review_at, r.status
       FROM user_vocabulary v
       LEFT JOIN user_word_reviews r ON r.lemma = v.word
       WHERE r.next_review_at IS NULL OR r.next_review_at <= ?
       ORDER BY COALESCE(r.next_review_at, v.created_at) ASC LIMIT ?`,
      [nowIso(), limit],
    );
    return rows.map((row) => ({
      id: row.id,
      word: row.word,
      videoId: row.video_id,
      definitionZh: row.definition_zh,
      definitionEn: row.definition_en,
      phonetic: row.phonetic,
      partOfSpeech: row.part_of_speech,
      exampleEn: row.example_en,
      exampleZh: row.example_zh,
      sourceTime: row.source_time,
      createdAt: row.created_at,
      lemma: row.word,
      repetitions: row.repetitions ?? 0,
      easeFactor: row.ease_factor ?? 2.5,
      intervalDays: row.interval_days ?? 0,
      nextReviewAt: row.next_review_at ?? nowIso(),
      status: row.status ?? "learning",
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
// saved quotes + check-ins (local, single-user)
// ---------------------------------------------------------------------------

export interface QuoteInput {
  videoId: string;
  textEn: string;
  textZh?: string | null;
  startTime: number;
  endTime: number;
  notes?: string | null;
  videoTitle?: string | null;
}

export interface QuoteEntry extends QuoteInput {
  id: string;
  createdAt: string;
}

export async function saveQuote(input: QuoteInput): Promise<string> {
  const id = newId();
  await mutate(
    "saveQuote",
    `INSERT INTO user_quotes
       (id, video_id, text_en, text_zh, start_time, end_time, notes, video_title, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.videoId,
      input.textEn,
      input.textZh ?? null,
      input.startTime,
      input.endTime,
      input.notes ?? null,
      input.videoTitle ?? null,
      nowIso(),
    ],
  );
  return id;
}

export function getQuotes(videoId?: string): Promise<QuoteEntry[]> {
  return safeRead(async () => {
    const sql = videoId
      ? `SELECT * FROM user_quotes WHERE video_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM user_quotes ORDER BY created_at DESC`;
    const rows = await queryRows<{
      id: string;
      video_id: string;
      text_en: string;
      text_zh: string | null;
      start_time: number;
      end_time: number;
      notes: string | null;
      video_title: string | null;
      created_at: string;
    }>(sql, videoId ? [videoId] : []);
    return rows.map((row) => ({
      id: row.id,
      videoId: row.video_id,
      textEn: row.text_en,
      textZh: row.text_zh,
      startTime: row.start_time,
      endTime: row.end_time,
      notes: row.notes,
      videoTitle: row.video_title,
      createdAt: row.created_at,
    }));
  }, []);
}

export async function deleteQuote(id: string): Promise<void> {
  await mutate("deleteQuote/review", `DELETE FROM user_quote_reviews WHERE quote_id = ?`, [id]);
  await mutate("deleteQuote", `DELETE FROM user_quotes WHERE id = ?`, [id]);
}

export interface QuoteReviewState {
  quoteId: string;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string;
  status: string;
}

export interface ReviewQuote extends QuoteEntry, QuoteReviewState {}

export function getQuoteReviewState(quoteId: string): Promise<QuoteReviewState | null> {
  return safeRead(async () => {
    const rows = await queryRows<{
      quote_id: string;
      repetitions: number;
      ease_factor: number;
      interval_days: number;
      next_review_at: string;
      status: string;
    }>(`SELECT * FROM user_quote_reviews WHERE quote_id = ?`, [quoteId]);
    const row = rows[0];
    return row ? {
      quoteId: row.quote_id,
      repetitions: row.repetitions,
      easeFactor: row.ease_factor,
      intervalDays: row.interval_days,
      nextReviewAt: row.next_review_at,
      status: row.status,
    } : null;
  }, null);
}

export async function saveQuoteReviewState(state: QuoteReviewState): Promise<void> {
  await mutate(
    "saveQuoteReviewState",
    `INSERT INTO user_quote_reviews
       (quote_id, repetitions, ease_factor, interval_days, next_review_at, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(quote_id) DO UPDATE SET
       repetitions = excluded.repetitions,
       ease_factor = excluded.ease_factor,
       interval_days = excluded.interval_days,
       next_review_at = excluded.next_review_at,
       status = excluded.status,
       updated_at = excluded.updated_at`,
    [
      state.quoteId,
      state.repetitions,
      state.easeFactor,
      state.intervalDays,
      state.nextReviewAt,
      state.status,
      nowIso(),
    ],
  );
}

export function getDueReviewQuotes(limit = 20): Promise<ReviewQuote[]> {
  return safeRead(async () => {
    const rows = await queryRows<{
      id: string;
      video_id: string;
      text_en: string;
      text_zh: string | null;
      start_time: number;
      end_time: number;
      notes: string | null;
      video_title: string | null;
      created_at: string;
      repetitions: number | null;
      ease_factor: number | null;
      interval_days: number | null;
      next_review_at: string | null;
      status: string | null;
    }>(
      `SELECT q.*, r.repetitions, r.ease_factor, r.interval_days, r.next_review_at, r.status
       FROM user_quotes q
       LEFT JOIN user_quote_reviews r ON r.quote_id = q.id
       WHERE r.next_review_at IS NULL OR r.next_review_at <= ?
       ORDER BY COALESCE(r.next_review_at, q.created_at) ASC LIMIT ?`,
      [nowIso(), limit],
    );
    return rows.map((row) => ({
      id: row.id,
      videoId: row.video_id,
      textEn: row.text_en,
      textZh: row.text_zh,
      startTime: row.start_time,
      endTime: row.end_time,
      notes: row.notes,
      videoTitle: row.video_title,
      createdAt: row.created_at,
      quoteId: row.id,
      repetitions: row.repetitions ?? 0,
      easeFactor: row.ease_factor ?? 2.5,
      intervalDays: row.interval_days ?? 0,
      nextReviewAt: row.next_review_at ?? nowIso(),
      status: row.status ?? "learning",
    }));
  }, []);
}

export function getLocalReviewCadence(): Promise<ReviewCadence> {
  return safeRead(async () => {
    const rows = await queryRows<{ cadence: string }>(
      `SELECT cadence FROM user_review_preferences WHERE singleton = 1`,
    );
    const parsed = ReviewCadenceSchema.safeParse(rows[0]?.cadence);
    return parsed.success ? parsed.data : "steady";
  }, "steady");
}

export async function saveLocalReviewCadence(cadence: ReviewCadence): Promise<void> {
  await mutate(
    "saveLocalReviewCadence",
    `INSERT INTO user_review_preferences (singleton, cadence, updated_at)
     VALUES (1, ?, ?)
     ON CONFLICT(singleton) DO UPDATE SET cadence = excluded.cadence, updated_at = excluded.updated_at`,
    [cadence, nowIso()],
  );
}

export interface LocalRetentionStats {
  accountCreatedAt: string;
  activeDays: number;
  completedReviews: number;
  savedItems: number;
  nextReviewAt: string | null;
}

export function getLocalRetentionStats(now = new Date()): Promise<LocalRetentionStats> {
  return safeRead(async () => {
    const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const accountRows = await queryRows<{ created_at: string | null }>(
      `SELECT MIN(created_at) AS created_at FROM (
         SELECT created_at FROM user_vocabulary
         UNION ALL SELECT created_at FROM user_quotes
         UNION ALL SELECT created_at FROM history
       )`,
    );
    const checkinRows = await queryRows<{ active_days: number; completed_reviews: number }>(
      `SELECT COUNT(*) AS active_days, COALESCE(SUM(word_count), 0) AS completed_reviews
       FROM user_checkins WHERE checkin_date >= ?`,
      [windowStart.slice(0, 10)],
    );
    const savedRows = await queryRows<{ saved_items: number }>(
      `SELECT COUNT(*) AS saved_items FROM (
         SELECT created_at FROM user_vocabulary WHERE created_at >= ?
         UNION ALL SELECT created_at FROM user_quotes WHERE created_at >= ?
       )`,
      [windowStart, windowStart],
    );
    const nextRows = await queryRows<{ next_review_at: string | null }>(
      `SELECT MIN(next_review_at) AS next_review_at FROM (
         SELECT next_review_at FROM user_word_reviews WHERE next_review_at > ?
         UNION ALL SELECT next_review_at FROM user_quote_reviews WHERE next_review_at > ?
       )`,
      [now.toISOString(), now.toISOString()],
    );
    return {
      accountCreatedAt: accountRows[0]?.created_at ?? now.toISOString(),
      activeDays: Number(checkinRows[0]?.active_days ?? 0),
      completedReviews: Number(checkinRows[0]?.completed_reviews ?? 0),
      savedItems: Number(savedRows[0]?.saved_items ?? 0),
      nextReviewAt: nextRows[0]?.next_review_at ?? null,
    };
  }, {
    accountCreatedAt: now.toISOString(),
    activeDays: 0,
    completedReviews: 0,
    savedItems: 0,
    nextReviewAt: null,
  });
}

export interface CheckinSummary {
  streak: number;
  todayCompleted: boolean;
  todayCount: number;
  calendar: Array<{ date: string; count: number }>;
}

function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function incrementCheckin(wordCount: number): Promise<CheckinSummary> {
  const increment = Math.max(1, Math.floor(wordCount));
  const today = isoDate();
  await mutate(
    "incrementCheckin",
    `INSERT INTO user_checkins (checkin_date, word_count) VALUES (?, ?)
     ON CONFLICT(checkin_date) DO UPDATE SET word_count = word_count + excluded.word_count`,
    [today, increment],
  );
  return getCheckinSummary();
}

export function getCheckinSummary(): Promise<CheckinSummary> {
  return safeRead(async () => {
    const firstDate = new Date();
    firstDate.setUTCDate(firstDate.getUTCDate() - 364);
    const rows = await queryRows<{ checkin_date: string; word_count: number }>(
      `SELECT checkin_date, word_count FROM user_checkins
       WHERE checkin_date >= ? ORDER BY checkin_date DESC`,
      [isoDate(firstDate)],
    );
    const counts = new Map(rows.map((row) => [row.checkin_date, row.word_count]));
    const today = isoDate();
    let streak = 0;
    const cursor = new Date(`${today}T00:00:00.000Z`);
    for (let day = 0; day < 365; day += 1) {
      const date = isoDate(cursor);
      if ((counts.get(date) ?? 0) >= 10) {
        streak += 1;
      } else if (day > 0) {
        break;
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    const calendarStart = new Date();
    calendarStart.setUTCDate(calendarStart.getUTCDate() - 29);
    return {
      streak,
      todayCompleted: (counts.get(today) ?? 0) >= 10,
      todayCount: counts.get(today) ?? 0,
      calendar: rows
        .filter((row) => row.checkin_date >= isoDate(calendarStart))
        .map((row) => ({ date: row.checkin_date, count: row.word_count })),
    };
  }, { streak: 0, todayCompleted: false, todayCount: 0, calendar: [] });
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
