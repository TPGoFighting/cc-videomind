import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

export function hasTencentDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.startsWith("postgres"));
}

export function getTencentPool(): Pool {
  if (!hasTencentDatabase()) {
    throw new Error("DATABASE_URL is not configured for Tencent Cloud PostgreSQL.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return pool;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS app_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON app_sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS video_analyses (
    video_id TEXT PRIMARY KEY,
    metadata JSONB,
    transcript JSONB,
    analysis JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_videos (
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL REFERENCES video_analyses(video_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, video_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    body TEXT NOT NULL,
    timestamp_seconds DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS user_notes_user_idx ON user_notes(user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS user_vocabulary (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    lemma TEXT NOT NULL,
    video_id TEXT NOT NULL,
    definition_zh TEXT,
    definition_en TEXT,
    phonetic TEXT,
    part_of_speech TEXT,
    example_en TEXT,
    example_zh TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, lemma)
  )`,
  `CREATE TABLE IF NOT EXISTS user_quotes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    text_en TEXT NOT NULL,
    text_zh TEXT,
    start_time DOUBLE PRECISION NOT NULL,
    end_time DOUBLE PRECISION NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS user_quotes_user_idx ON user_quotes(user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS user_word_reviews (
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    lemma TEXT NOT NULL,
    repetitions INTEGER NOT NULL DEFAULT 0,
    ease_factor DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    next_review_at TIMESTAMPTZ NOT NULL,
    last_reviewed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'learning',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, lemma)
  )`,
  `CREATE TABLE IF NOT EXISTS user_checkins (
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    word_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, checkin_date)
  )`,
  `CREATE TABLE IF NOT EXISTS video_translations (
    id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    video_id TEXT NOT NULL,
    language TEXT NOT NULL,
    version INTEGER NOT NULL,
    segments JSONB NOT NULL,
    provider TEXT,
    model TEXT,
    quality_score DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(video_id, language, version)
  )`,
  `CREATE INDEX IF NOT EXISTS video_translations_latest_idx ON video_translations(video_id, language, version DESC)`,
  `CREATE TABLE IF NOT EXISTS ai_results_cache (
    video_id TEXT NOT NULL,
    result_type TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT '',
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (video_id, result_type, language, mode, theme)
  )`,
  `CREATE INDEX IF NOT EXISTS ai_results_cache_latest_idx ON ai_results_cache(video_id, result_type, updated_at DESC)`,
];

export async function ensureTencentSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const database = getTencentPool();
      for (const statement of SCHEMA) {
        await database.query(statement);
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function queryTencent<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  await ensureTencentSchema();
  return getTencentPool().query<T>(text, values);
}
