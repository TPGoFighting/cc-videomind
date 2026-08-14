import assert from "node:assert/strict";
import test from "node:test";
import { AsrTranscriptError, transcriptFromAsrResponse } from "./transcript";

test("uses provider timestamps when ASR returns segments", () => {
  const transcript = transcriptFromAsrResponse(
    {
      segments: [
        { start: 1.25, end: 3.5, text: "  Hello\nworld " },
        { start: 4, end: 6, text: "Second line" },
      ],
    },
    60,
  );

  assert.deepEqual(transcript, [
    { startTime: 1.25, endTime: 3.5, text: "Hello world" },
    { startTime: 4, endTime: 6, text: "Second line" },
  ]);
});

test("uses explicitly marked proportional timestamps only for text-only ASR responses", () => {
  const transcript = transcriptFromAsrResponse({ text: "First sentence. Second sentence." }, 20);

  assert.equal(transcript.length, 2);
  assert.equal(transcript[0].startTime, 0);
  assert.equal(transcript.at(-1)?.endTime, 20);
});

test("rejects empty or invalid ASR output instead of completing a task with no transcript", () => {
  assert.throws(
    () => transcriptFromAsrResponse({ text: "   " }, 20),
    (error: unknown) => error instanceof AsrTranscriptError,
  );
  assert.throws(
    () => transcriptFromAsrResponse({ segments: [{ start: 5, end: 4, text: "Backwards" }] }, 20),
    (error: unknown) => error instanceof AsrTranscriptError,
  );
});
