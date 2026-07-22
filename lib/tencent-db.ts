import { Pool, type PoolClient, type QueryResultRow } from "pg";

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

export const TENCENT_SCHEMA_STATEMENTS = [
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
  `CREATE TABLE IF NOT EXISTS user_privacy_preferences (
    user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    analytics_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    consented_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS product_events (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL CHECK (event_name IN (
      'video_parse_started', 'video_parse_completed', 'video_parse_failed',
      'analysis_completed', 'analysis_failed', 'learning_item_saved',
      'review_opened', 'review_completed', 'upgrade_opened', 'upgrade_paid'
    )),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS product_events_name_time_idx ON product_events(event_name, occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS product_events_user_time_idx ON product_events(user_id, occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS product_events_expiry_idx ON product_events(expires_at)`,
  `CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    account_email_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    process_after TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    error_code TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_active_user_idx ON account_deletion_requests(user_id) WHERE status IN ('pending', 'processing')`,
  `CREATE INDEX IF NOT EXISTS account_deletion_due_idx ON account_deletion_requests(status, process_after)`,
  `CREATE TABLE IF NOT EXISTS admin_audit_events (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS admin_audit_events_actor_time_idx ON admin_audit_events(actor_user_id, occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS admin_audit_events_expiry_idx ON admin_audit_events(expires_at)`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS user_ai_settings (
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
  )`,
  `CREATE TABLE IF NOT EXISTS payment_submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('pro', 'max')),
    transaction_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled', 'failed')),
    reviewed_by TEXT REFERENCES app_users(id),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
  )`,
  `ALTER TABLE payment_submissions DROP CONSTRAINT IF EXISTS payment_submissions_status_check`,
  `ALTER TABLE payment_submissions ADD CONSTRAINT payment_submissions_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled', 'failed'))`,
  `CREATE INDEX IF NOT EXISTS payment_submissions_user_idx ON payment_submissions(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS payment_submissions_status_idx ON payment_submissions(status, created_at DESC)`,
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
    source_time DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, lemma)
  )`,
  `ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE user_vocabulary ADD COLUMN IF NOT EXISTS source_time DOUBLE PRECISION`,
  `CREATE TABLE IF NOT EXISTS word_definitions (
    lemma TEXT PRIMARY KEY,
    phonetic TEXT,
    part_of_speech TEXT,
    definition_zh TEXT NOT NULL,
    definition_en TEXT,
    example_en TEXT,
    example_zh TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  `CREATE INDEX IF NOT EXISTS user_word_reviews_due_idx ON user_word_reviews(user_id, next_review_at)`,
  `CREATE TABLE IF NOT EXISTS user_quote_reviews (
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    quote_id TEXT NOT NULL REFERENCES user_quotes(id) ON DELETE CASCADE,
    repetitions INTEGER NOT NULL DEFAULT 0,
    ease_factor DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 1,
    next_review_at TIMESTAMPTZ NOT NULL,
    last_reviewed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'learning',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, quote_id)
  )`,
  `CREATE INDEX IF NOT EXISTS user_quote_reviews_due_idx ON user_quote_reviews(user_id, next_review_at)`,
  `CREATE TABLE IF NOT EXISTS user_review_preferences (
    user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    cadence TEXT NOT NULL DEFAULT 'steady' CHECK (cadence IN ('light', 'steady', 'focused')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  `CREATE TABLE IF NOT EXISTS video_chunks (
    id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    video_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    segment_start INTEGER NOT NULL,
    segment_end INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(video_id, chunk_index)
  )`,
  `CREATE INDEX IF NOT EXISTS video_chunks_video_idx ON video_chunks(video_id, chunk_index)`,
  `CREATE TABLE IF NOT EXISTS async_tasks (
    id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
    task_type TEXT NOT NULL,
    video_id TEXT NOT NULL,
    user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    input JSONB,
    output JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS async_tasks_status_idx ON async_tasks(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS async_tasks_video_idx ON async_tasks(video_id, created_at DESC)`,
];

export async function ensureTencentSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const database = getTencentPool();
      for (const statement of TENCENT_SCHEMA_STATEMENTS) {
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

export async function withTencentTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  await ensureTencentSchema();
  const client = await getTencentPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
