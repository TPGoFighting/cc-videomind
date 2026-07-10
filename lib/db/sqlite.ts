import initSqlJs, {
  type Database,
  type SqlJsStatic,
  type SqlValue,
} from "sql.js";
import path from "node:path";

const DB_PATH =
  process.env.SQLITE_PATH ?? path.resolve(/* turbopackIgnore: true */ process.cwd(), "teachplayer.sqlite");

const DEFAULT_WASM = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  "node_modules",
  "sql.js",
  "dist",
  "sql-wasm.wasm",
);
const WASM_PATH = process.env.SQLJS_WASM_PATH ?? DEFAULT_WASM;

let sqlStatic: SqlJsStatic | null = null;
let db: Database | null = null;
let schemaReady = false;

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (sqlStatic) return sqlStatic;
  sqlStatic = await initSqlJs({ locateFile: () => WASM_PATH });
  return sqlStatic;
}

async function readExistingFile(): Promise<Uint8Array | null> {
  try {
    const fs = await import("node:fs");
    if (fs.existsSync(DB_PATH)) {
      return fs.readFileSync(DB_PATH);
    }
  } catch {
    // no file yet -> start fresh
  }
  return null;
}

export async function getDb(): Promise<Database> {
  if (db) {
    if (!schemaReady) await ensureSchema(db);
    return db;
  }
  const SQL = await loadSqlJs();
  const bytes = await readExistingFile();
  db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  await ensureSchema(db);
  return db;
}

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS async_tasks (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    video_id TEXT NOT NULL,
    user_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    input TEXT,
    output TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_async_tasks_status ON async_tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_async_tasks_video_id ON async_tasks(video_id)`,

  `CREATE TABLE IF NOT EXISTS video_translations (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    language TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    segments TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    quality_score REAL,
    created_at TEXT NOT NULL,
    UNIQUE(video_id, language, version)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_video_translations_lookup ON video_translations(video_id, language)`,

  `CREATE TABLE IF NOT EXISTS video_chunks (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    segment_start INTEGER NOT NULL,
    segment_end INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(video_id, chunk_index)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_video_chunks_video_id ON video_chunks(video_id)`,

  `CREATE TABLE IF NOT EXISTS analysis (
    video_id TEXT PRIMARY KEY,
    metadata TEXT,
    transcript TEXT,
    analysis TEXT,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS history (
    video_id TEXT PRIMARY KEY,
    title TEXT,
    author TEXT,
    thumbnail TEXT,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS user_vocabulary (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    video_id TEXT NOT NULL,
    definition_zh TEXT,
    definition_en TEXT,
    phonetic TEXT,
    part_of_speech TEXT,
    example_en TEXT,
    example_zh TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_vocabulary_word_idx ON user_vocabulary(word)`,

  `CREATE TABLE IF NOT EXISTS user_word_reviews (
    lemma TEXT PRIMARY KEY,
    repetitions INTEGER NOT NULL DEFAULT 0,
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    next_review_at TEXT NOT NULL,
    last_reviewed_at TEXT,
    status TEXT NOT NULL DEFAULT 'learning',
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS user_word_reviews_due_idx ON user_word_reviews(next_review_at)`,

  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    body TEXT NOT NULL,
    timestamp_seconds REAL,
    video_title TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS notes_video_idx ON notes(video_id, created_at DESC)`,
];

async function ensureSchema(database: Database): Promise<void> {
  if (schemaReady) return;
  for (const stmt of SCHEMA) {
    if (stmt.trim()) database.run(stmt);
  }
  schemaReady = true;
  await persist();
}

export async function initSchema(): Promise<void> {
  const database = await getDb();
  await ensureSchema(database);
}

export async function persist(): Promise<void> {
  if (!db) return;
  const data = db.export();
  const fs = await import("node:fs");
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export async function closeDb(): Promise<void> {
  if (db) {
    await persist();
    db.close();
    db = null;
  }
  schemaReady = false;
}

export type { SqlValue };
