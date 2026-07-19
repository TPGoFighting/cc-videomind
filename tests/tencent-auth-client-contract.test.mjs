import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Android authentication uses the Web Tencent account API and SecureStore", async () => {
  const client = await read("apps/mobile/src/lib/tencent-auth-client.ts");
  const provider = await read("apps/mobile/src/providers/auth-provider.tsx");

  assert.match(client, /expo-secure-store/);
  assert.match(client, /\/api\/auth\/login/);
  assert.match(client, /\/api\/auth\/register/);
  assert.match(client, /\/api\/auth\/logout/);
  assert.match(client, /X-Teach-Player-Client/);
  assert.match(provider, /restoreTencentSession/);
  assert.doesNotMatch(provider, /@supabase\/supabase-js/);
});

test("the Android runtime no longer requires Supabase public configuration", async () => {
  const productionTemplate = await read("apps/mobile/.env.production.example");
  const mobilePackage = await read("apps/mobile/package.json");
  const configVerifier = await read("scripts/verifyMobileWebConfig.mjs");

  assert.doesNotMatch(productionTemplate, /SUPABASE/);
  assert.doesNotMatch(mobilePackage, /@supabase\/supabase-js/);
  assert.doesNotMatch(configVerifier, /SUPABASE/);
});
