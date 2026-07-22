import assert from "node:assert/strict";
import { test } from "node:test";
import { clearAiProviderCache, getAiProvider } from "@/lib/ai/provider";

test("missing AI configuration fails before any provider request", async () => {
  const previous = {
    provider: process.env.AI_PROVIDER,
    apiKey: process.env.AI_API_KEY,
    baseUrl: process.env.AI_API_BASE_URL,
    model: process.env.AI_MODEL,
  };

  delete process.env.AI_PROVIDER;
  delete process.env.AI_API_KEY;
  delete process.env.AI_API_BASE_URL;
  delete process.env.AI_MODEL;
  clearAiProviderCache();

  try {
    await assert.rejects(
      getAiProvider(),
      (error: unknown) => error instanceof Error && error.message.startsWith("AI_API_KEY 未配置"),
    );
  } finally {
    if (previous.provider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previous.provider;
    if (previous.apiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previous.apiKey;
    if (previous.baseUrl === undefined) delete process.env.AI_API_BASE_URL;
    else process.env.AI_API_BASE_URL = previous.baseUrl;
    if (previous.model === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = previous.model;
    clearAiProviderCache();
  }
});
