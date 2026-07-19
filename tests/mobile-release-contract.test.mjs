import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the mobile workspace ships its shared contract source", async () => {
  const shared = await read("packages/shared/src/index.ts");

  for (const exportedName of [
    "VideoAnalysisPayloadSchema",
    "extractVideoId",
    "formatTime",
    "isBilibiliVideoId",
  ]) {
    assert.match(shared, new RegExp(`export (?:const|function) ${exportedName}`));
  }
});

test("a release build never falls back to the debug signing key", async () => {
  const gradle = await read("apps/mobile/android/app/build.gradle");
  const releaseBlock = gradle.match(/release\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";

  assert.doesNotMatch(releaseBlock, /signingConfigs\.debug/);
  assert.match(gradle, /release-signing\.properties/);
  assert.match(gradle, /Release signing is required/);
});

test("Android releases are split by ABI instead of shipping one oversized universal APK", async () => {
  const gradle = await read("apps/mobile/android/app/build.gradle");

  assert.match(gradle, /splits\s*\{\s*abi\s*\{/s);
  assert.match(gradle, /universalApk false/);
  assert.match(gradle, /"arm64-v8a"/);
});

test("the app version and Android version code are ready for the next production release", async () => {
  const appConfig = await read("apps/mobile/app.json");
  const gradle = await read("apps/mobile/android/app/build.gradle");
  const mobilePackage = await read("apps/mobile/package.json");

  assert.match(appConfig, /"version": "1\.8\.1"/);
  assert.match(gradle, /versionCode 9/);
  assert.match(gradle, /versionName "1\.8\.1"/);
  assert.match(mobilePackage, /"version": "1\.8\.1"/);
});

test("an older deployed API cannot break an authenticated mobile session when /api/me is absent", async () => {
  const api = await read("apps/mobile/src/lib/api.ts");

  assert.match(api, /error instanceof ApiError && error\.status === 404/);
  assert.match(api, /authenticated: Boolean\(token\)/);
});

test("the mobile app pins a Hermes-compatible Supabase client", async () => {
  const mobilePackage = await read("apps/mobile/package.json");

  assert.match(mobilePackage, /"@supabase\/supabase-js": "2\.49\.8"/);
});

test("Metro prefers browser-safe ESM entry points over Node CommonJS entry points", async () => {
  const metro = await read("apps/mobile/metro.config.js");

  assert.match(metro, /resolverMainFields\s*=\s*\["react-native", "browser", "module", "main"\]/);
});

test("Metro maps Supabase's optional Node websocket implementation to React Native's WebSocket", async () => {
  const metro = await read("apps/mobile/metro.config.js");
  const websocketMock = await read("apps/mobile/mocks/ws.js");

  assert.match(metro, /moduleName === "ws"/);
  assert.match(websocketMock, /global\.WebSocket/);
});
