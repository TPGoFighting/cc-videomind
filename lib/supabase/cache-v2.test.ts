import assert from "node:assert/strict";
import test from "node:test";
import { isFreshCacheEntry } from "@/lib/supabase/cache-v2";

test("accepts a successful AI cache entry within its TTL", () => {
  assert.equal(isFreshCacheEntry(new Date(Date.now() - 60_000).toISOString()), true);
});

test("rejects an expired or invalid AI cache entry", () => {
  assert.equal(isFreshCacheEntry(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()), false);
  assert.equal(isFreshCacheEntry("not-a-date"), false);
});
