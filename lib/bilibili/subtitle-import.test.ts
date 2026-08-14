import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SubtitleImportError, parseSubtitleImport } from "@/lib/bilibili/subtitle-import";

describe("Bilibili subtitle import", () => {
  it("parses Bilibili JSON subtitle exports", () => {
    const result = parseSubtitleImport({
      filename: "bilibili-subtitle.json",
      content: JSON.stringify({
        body: [
          { from: 1.25, to: 3.5, content: "  Hello\nworld " },
          { from: 4, to: 6, content: "Second line" },
        ],
      }),
    });

    assert.deepEqual(result.segments, [
      { startTime: 1.25, endTime: 3.5, text: "Hello world" },
      { startTime: 4, endTime: 6, text: "Second line" },
    ]);
    assert.equal(result.sourceFormat, "bilibili_json");
  });

  it("parses SRT and WebVTT timecodes", () => {
    const srt = parseSubtitleImport({
      filename: "lesson.srt",
      content: "1\n00:00:01,250 --> 00:00:03,500\nHello\nworld\n\n2\n00:00:04,000 --> 00:00:06,000\nSecond line\n",
    });
    const vtt = parseSubtitleImport({
      filename: "lesson.vtt",
      content: "WEBVTT\n\n00:00:01.250 --> 00:00:03.500\nHello world\n",
    });

    assert.deepEqual(srt.segments[0], { startTime: 1.25, endTime: 3.5, text: "Hello world" });
    assert.deepEqual(vtt.segments[0], { startTime: 1.25, endTime: 3.5, text: "Hello world" });
  });

  it("rejects plain text and invalid time ranges instead of inventing false timestamps", () => {
    assert.throws(
      () => parseSubtitleImport({ filename: "lesson.txt", content: "No time information" }),
      (error: unknown) => error instanceof SubtitleImportError && error.code === "timecodes_required",
    );
    assert.throws(
      () => parseSubtitleImport({ filename: "lesson.srt", content: "1\n00:00:04,000 --> 00:00:03,000\nBackwards\n" }),
      (error: unknown) => error instanceof SubtitleImportError && error.code === "invalid_subtitle",
    );
  });
});
