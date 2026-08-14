import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Tencent session lookup accepts an Android Bearer token before falling back to a browser cookie", async () => {
  const auth = await read("lib/tencent-auth.ts");
  const quota = await read("lib/supabase/quota.ts");

  assert.match(auth, /export async function getTencentUser\(request\?: Request\)/);
  assert.match(auth, /request\?\.headers\.get\("authorization"\)/);
  assert.match(auth, /\(await cookies\(\)\)\.get\(SESSION_COOKIE\)/);
  assert.match(quota, /getTencentUser\(request\)/);
});

test("native login and registration return an opaque session token only to the Android client", async () => {
  const login = await read("app/api/auth/login/route.ts");
  const register = await read("app/api/auth/register/route.ts");

  for (const route of [login, register]) {
    assert.match(route, /X-Teach-Player-Client/);
    assert.match(route, /accessToken/);
    assert.match(route, /createTencentSession/);
  }
});

test("the profile endpoint uses the incoming request when resolving a Tencent account", async () => {
  const profile = await read("app/api/me/route.ts");

  assert.match(profile, /GET\(request: Request\)/);
  assert.match(profile, /getTencentUser\(request\)/);
});

test("a mobile user can change a password through an authenticated Tencent API route", async () => {
  const auth = await read("lib/tencent-auth.ts");
  const route = await read("app/api/auth/change-password/route.ts");

  assert.match(auth, /export async function changeTencentPassword/);
  assert.match(route, /getTencentUser\(request\)/);
  assert.match(route, /currentPassword/);
  assert.match(route, /rateLimit: \{ maxRequests: 5, windowMs: 60_000 \}/);
});

test("manual payment submission uses Tencent PostgreSQL and the same Bearer session", async () => {
  const database = await read("lib/tencent-db.ts");
  const route = await read("app/api/payment/submit/route.ts");

  assert.match(database, /CREATE TABLE IF NOT EXISTS payment_submissions/);
  assert.match(route, /getTencentUser\(request\)/);
  assert.match(route, /queryTencent/);
  assert.match(route, /payment-submit/);
});
