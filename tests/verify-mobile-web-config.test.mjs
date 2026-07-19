import assert from "node:assert/strict";
import test from "node:test";
import {
  comparePublicRuntimeConfig,
  parseEnv,
} from "../scripts/verifyMobileWebConfig.mjs";

test("parses public build variables without exposing unrelated values", () => {
  assert.deepEqual(
    parseEnv("# comment\nNEXT_PUBLIC_APP_URL=https://video.tpgofighting.top\nKEY=value=with-equals\n"),
    {
      NEXT_PUBLIC_APP_URL: "https://video.tpgofighting.top",
      KEY: "value=with-equals",
    }
  );
});

test("accepts matching Web and Android public runtime configuration", () => {
  assert.deepEqual(
    comparePublicRuntimeConfig(
      {
        NEXT_PUBLIC_APP_URL: "https://video.tpgofighting.top/",
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      },
      {
        EXPO_PUBLIC_API_BASE_URL: "https://video.tpgofighting.top",
        EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
      }
    ),
    []
  );
});

test("reports missing or drifting public configuration by key name only", () => {
  const issues = comparePublicRuntimeConfig(
    {
      NEXT_PUBLIC_APP_URL: "https://video.tpgofighting.top",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "web-key",
    },
    {
      EXPO_PUBLIC_API_BASE_URL: "https://staging.example.com",
      EXPO_PUBLIC_SUPABASE_URL: "",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "mobile-key",
    }
  );

  assert.deepEqual(issues, [
    "EXPO_PUBLIC_API_BASE_URL does not match NEXT_PUBLIC_APP_URL",
    "EXPO_PUBLIC_SUPABASE_URL is missing",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY does not match NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]);
  assert.equal(issues.join(" ").includes("web-key"), false);
  assert.equal(issues.join(" ").includes("mobile-key"), false);
});
