import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all Android network entry points use one canonical API origin", async () => {
  const runtimeConfig = await read("apps/mobile/src/lib/runtime-config.ts");
  const api = await read("apps/mobile/src/lib/api.ts");
  const tabLayout = await read("apps/mobile/app/(tabs)/_layout.tsx");
  const videoPlayer = await read("apps/mobile/src/components/video-player.tsx");

  assert.match(runtimeConfig, /DEFAULT_API_BASE_URL = "https:\/\/video\.tpgofighting\.top"/);
  assert.match(api, /import \{ getApiBaseUrl \} from "\.\/runtime-config"/);
  assert.doesNotMatch(tabLayout, /EXPO_PUBLIC_API_BASE_URL/);
  assert.doesNotMatch(videoPlayer, /10\.0\.2\.2:3000/);
  assert.match(tabLayout, /getApiBaseUrl\(\)/);
  assert.match(videoPlayer, /getApiBaseUrl\(\)/);
});

test("Android translation streaming matches the Web translate-transcript contract", async () => {
  const api = await read("apps/mobile/src/lib/api.ts");

  assert.match(api, /\/api\/translate-transcript/);
  assert.doesNotMatch(api, /\/api\/transcript-translations\/stream/);
  assert.match(api, /body: JSON\.stringify\(\{ videoId \}\)/);
  assert.match(api, /update\?\.startTime/);
});

test("the production environment template makes the Web origin explicit", async () => {
  const productionTemplate = await read("apps/mobile/.env.production.example");
  const gitignore = await read("apps/mobile/.gitignore");

  assert.match(productionTemplate, /EXPO_PUBLIC_API_BASE_URL=https:\/\/video\.tpgofighting\.top/);
  assert.doesNotMatch(productionTemplate, /SUPABASE/);
  assert.match(gitignore, /^\.env\*$/m);
  assert.match(gitignore, /^!\.env\.production\.example$/m);
});
