import assert from "node:assert/strict";
import { test } from "node:test";
import { OpenAiCompatibleProvider } from "@/lib/ai/provider";

test("retries a transient 429 before falling back from JSON mode", async () => {
  const previousFetch = globalThis.fetch;
  const previousInterval = process.env.AI_PROVIDER_MIN_INTERVAL_MS;
  const previousRetryBase = process.env.AI_PROVIDER_RETRY_BASE_MS;
  let calls = 0;

  process.env.AI_PROVIDER_MIN_INTERVAL_MS = "0";
  process.env.AI_PROVIDER_RETRY_BASE_MS = "0";
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) return new Response("rate limited", { status: 429 });
    if (calls === 2) return new Response("unsupported format", { status: 400 });
    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"answer":"ok","citations":[]}' } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const provider = new OpenAiCompatibleProvider("test-key", "https://example.test/v1", "test-model");
    const answer = await provider.answerQuestion({
      question: "What is this about?",
      transcript: [{ startTime: 0, endTime: 2, text: "A short source sentence." }],
    });
    assert.equal(answer.answer, "ok");
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousInterval === undefined) delete process.env.AI_PROVIDER_MIN_INTERVAL_MS;
    else process.env.AI_PROVIDER_MIN_INTERVAL_MS = previousInterval;
    if (previousRetryBase === undefined) delete process.env.AI_PROVIDER_RETRY_BASE_MS;
    else process.env.AI_PROVIDER_RETRY_BASE_MS = previousRetryBase;
  }
});

test("surfaces a timeout without repeating the same request in no-format mode", async () => {
  const previousFetch = globalThis.fetch;
  const previousInterval = process.env.AI_PROVIDER_MIN_INTERVAL_MS;
  let calls = 0;

  process.env.AI_PROVIDER_MIN_INTERVAL_MS = "0";
  globalThis.fetch = (async (_input, init) => {
    calls += 1;
    await new Promise<void>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
    throw new Error("unreachable");
  }) as typeof fetch;

  try {
    const provider = new OpenAiCompatibleProvider(
      "test-key",
      "https://example.test/v1",
      "test-model",
      [],
      { requestTimeoutMs: 1, maxAttempts: 1 },
    );
    await assert.rejects(
      () => provider.answerQuestion({
        question: "What is this about?",
        transcript: [{ startTime: 0, endTime: 2, text: "A short source sentence." }],
      }),
      /AI provider timed out/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousInterval === undefined) delete process.env.AI_PROVIDER_MIN_INTERVAL_MS;
    else process.env.AI_PROVIDER_MIN_INTERVAL_MS = previousInterval;
  }
});

test("does not retry a timed-out compatibility request before surfacing the failure", async () => {
  const previousFetch = globalThis.fetch;
  const previousInterval = process.env.AI_PROVIDER_MIN_INTERVAL_MS;
  let calls = 0;

  process.env.AI_PROVIDER_MIN_INTERVAL_MS = "0";
  globalThis.fetch = (async (_input, init) => {
    calls += 1;
    await new Promise<void>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
    throw new Error("unreachable");
  }) as typeof fetch;

  try {
    const provider = new OpenAiCompatibleProvider(
      "test-key",
      "https://example.test/v1",
      "test-model",
      [],
      { requestTimeoutMs: 1 },
    );
    await assert.rejects(
      () => provider.answerQuestion({
        question: "What is this about?",
        transcript: [{ startTime: 0, endTime: 2, text: "A short source sentence." }],
      }),
      /AI provider timed out/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousInterval === undefined) delete process.env.AI_PROVIDER_MIN_INTERVAL_MS;
    else process.env.AI_PROVIDER_MIN_INTERVAL_MS = previousInterval;
  }
});

test("translation lane is not blocked by a long default-lane request", async () => {
  const previousFetch = globalThis.fetch;
  const previousInterval = process.env.AI_PROVIDER_MIN_INTERVAL_MS;
  let calls = 0;
  let defaultStarted!: () => void;
  const defaultStartedPromise = new Promise<void>((resolve) => {
    defaultStarted = resolve;
  });
  let releaseDefault!: () => void;
  const defaultReleasePromise = new Promise<void>((resolve) => {
    releaseDefault = resolve;
  });

  process.env.AI_PROVIDER_MIN_INTERVAL_MS = "0";
  globalThis.fetch = (async (_input, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as { messages?: Array<{ content?: string }> };
    const userPrompt = body.messages?.[1]?.content ?? "";
    if (userPrompt.includes("What is this about?")) {
      defaultStarted();
      await defaultReleasePromise;
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"answer":"ok","citations":[]}' } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      choices: [{ message: { content: "[OUTPUT_0]\n译文\n[/OUTPUT_0]" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const provider = new OpenAiCompatibleProvider("test-key", "https://example.test/v1", "test-model");
    const answerPromise = provider.answerQuestion({
      question: "What is this about?",
      transcript: [{ startTime: 0, endTime: 2, text: "A short source sentence." }],
    });
    await defaultStartedPromise;

    const translationPromise = provider.translateTranscript({
      segments: [{ startTime: 0, endTime: 2, text: "A short source sentence." }],
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(calls, 2);

    releaseDefault();
    const [answer, translation] = await Promise.all([answerPromise, translationPromise]);
    assert.equal(answer.answer, "ok");
    assert.equal(translation[0]?.text_zh, "译文");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousInterval === undefined) delete process.env.AI_PROVIDER_MIN_INTERVAL_MS;
    else process.env.AI_PROVIDER_MIN_INTERVAL_MS = previousInterval;
  }
});
