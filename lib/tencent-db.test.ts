import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TENCENT_SCHEMA_STATEMENTS } from "@/lib/tencent-db";

const schemaSql = TENCENT_SCHEMA_STATEMENTS.join("\n").toLowerCase();

describe("Tencent PostgreSQL authoritative schema", () => {
  it("creates every table used by production repositories", () => {
    const requiredTables = [
      "app_users",
      "app_sessions",
      "user_privacy_preferences",
      "product_events",
      "account_deletion_requests",
      "admin_audit_events",
      "app_settings",
      "user_ai_settings",
      "video_analyses",
      "ai_results_cache",
      "video_translations",
      "word_definitions",
      "user_videos",
      "user_notes",
      "user_vocabulary",
      "user_quotes",
      "user_word_reviews",
      "user_quote_reviews",
      "user_review_preferences",
      "user_checkins",
      "payment_submissions",
      "video_chunks",
      "async_tasks",
    ];

    for (const table of requiredTables) {
      assert.match(schemaSql, new RegExp(`create table if not exists ${table}\\b`));
    }
  });

  it("keeps user-owned tables tied to app_users", () => {
    for (const table of ["app_sessions", "user_privacy_preferences", "user_ai_settings", "user_videos", "user_notes", "user_vocabulary", "user_quotes", "user_word_reviews", "user_quote_reviews", "user_review_preferences", "user_checkins", "payment_submissions"]) {
      const statement = TENCENT_SCHEMA_STATEMENTS.find((sql) =>
        sql.toLowerCase().includes(`create table if not exists ${table}`),
      );
      assert.ok(statement, `missing schema statement for ${table}`);
      assert.match(statement.toLowerCase(), /references app_users\(id\)/);
    }
  });

  it("stores review source time and cascades sentence review state", () => {
    assert.match(schemaSql, /alter table user_vocabulary add column if not exists source_time double precision/);
    const quoteReviewStatement = TENCENT_SCHEMA_STATEMENTS.find((sql) =>
      sql.toLowerCase().includes("create table if not exists user_quote_reviews"),
    );
    assert.ok(quoteReviewStatement);
    assert.match(quoteReviewStatement.toLowerCase(), /references user_quotes\(id\) on delete cascade/);
  });

  it("keeps analytics content-free by contract and bounded by expiry", () => {
    const eventStatement = TENCENT_SCHEMA_STATEMENTS.find((sql) =>
      sql.toLowerCase().includes("create table if not exists product_events"),
    );
    assert.ok(eventStatement);
    assert.match(eventStatement.toLowerCase(), /payload jsonb/);
    assert.match(eventStatement.toLowerCase(), /expires_at timestamptz not null/);
    assert.doesNotMatch(eventStatement.toLowerCase(), /transcript|prompt|answer|note_body/);
  });

  it("permits only one unresolved manual-payment submission per user", () => {
    assert.match(
      schemaSql,
      /create unique index if not exists payment_submissions_active_user_idx on payment_submissions\(user_id\) where status = 'pending'/,
    );
  });

  it("persists a bounded subscription expiry and immutable manual-payment snapshot", () => {
    assert.match(schemaSql, /subscription_expires_at timestamptz/);
    assert.match(schemaSql, /alter table app_users add column if not exists subscription_expires_at timestamptz/);
    assert.match(schemaSql, /subscription_usage_started_at timestamptz/);
    assert.match(schemaSql, /amount_cny integer/);
    assert.match(schemaSql, /access_days integer/);
  });
});
