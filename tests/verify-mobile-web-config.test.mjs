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

test("accepts matching Web and Android API origins", () => {
  assert.deepEqual(
    comparePublicRuntimeConfig(
      {
        NEXT_PUBLIC_APP_URL: "https://video.tpgofighting.top/",
      },
      {
        EXPO_PUBLIC_API_BASE_URL: "https://video.tpgofighting.top",
      }
    ),
    []
  );
});

test("reports a drifting API origin by key name only", () => {
  const issues = comparePublicRuntimeConfig(
    {
      NEXT_PUBLIC_APP_URL: "https://video.tpgofighting.top",
    },
    {
      EXPO_PUBLIC_API_BASE_URL: "https://staging.example.com",
    }
  );

  assert.deepEqual(issues, [
    "EXPO_PUBLIC_API_BASE_URL does not match NEXT_PUBLIC_APP_URL",
  ]);
});
