import assert from "node:assert/strict";
import test from "node:test";
import {
  AsrConfigurationError,
  AsrServiceError,
  getAsrConfiguration,
  requestAsrTranscript,
} from "./client";

test("missing ASR key fails before an outbound request can be created", () => {
  assert.throws(
    () => getAsrConfiguration({}),
    (error: unknown) => error instanceof AsrConfigurationError,
  );
});

test("ASR error bodies are not copied into the thrown error", async () => {
  const configuration = getAsrConfiguration({
    ASR_API_KEY: "test-key",
    ASR_API_BASE_URL: "https://asr.invalid/v1",
    ASR_MODEL: "test-model",
  });

  await assert.rejects(
    requestAsrTranscript(
      configuration,
      { file: new Blob(["audio"]), filename: "fixture.m4a" },
      {
        fetchImpl: async () =>
          new Response("provider diagnostic that must stay private", { status: 401 }),
      },
    ),
    (error: unknown) =>
      error instanceof AsrServiceError &&
      error.status === 401 &&
      !error.message.includes("provider diagnostic"),
  );
});

test("valid ASR text responses are accepted", async () => {
  const configuration = getAsrConfiguration({
    ASR_API_KEY: "test-key",
    ASR_API_BASE_URL: "https://asr.invalid/v1/",
    ASR_MODEL: "test-model",
  });

  const payload = await requestAsrTranscript(
    configuration,
    { file: new Blob(["audio"]), filename: "fixture.m4a" },
    {
      fetchImpl: async (input, init) => {
        assert.equal(input, "https://asr.invalid/v1/audio/transcriptions");
        assert.equal(init?.headers && "Authorization" in init.headers, true);
        return Response.json({ text: "fixture transcript" });
      },
    },
  );

  assert.equal(payload.text, "fixture transcript");
});
