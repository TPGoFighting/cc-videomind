import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TENCENT_SCHEMA_STATEMENTS } from "@/lib/tencent-db";

const schemaSql = TENCENT_SCHEMA_STATEMENTS.join("\n").toLowerCase();

describe("Tencent PostgreSQL authoritative schema", () => {
  it("creates every table used by production repositories", () => {
    const requiredTables = [
      "app_users",
      "app_sessions",
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
    for (const table of ["app_sessions", "user_ai_settings", "user_videos", "user_notes", "user_vocabulary", "user_quotes", "user_word_reviews", "user_checkins", "payment_submissions"]) {
      const statement = TENCENT_SCHEMA_STATEMENTS.find((sql) =>
        sql.toLowerCase().includes(`create table if not exists ${table}`),
      );
      assert.ok(statement, `missing schema statement for ${table}`);
      assert.match(statement.toLowerCase(), /references app_users\(id\)/);
    }
  });
});
