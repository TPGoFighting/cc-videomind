import assert from "node:assert/strict";
import test from "node:test";
import type { TranscriptSegment } from "@/lib/types";
import {
  hasCompleteTranslation,
  hasDisplayableTranslation,
  mergeCachedTranslation,
} from "@/lib/utils/translation";

const englishTranscript: TranscriptSegment[] = [
  { startTime: 0, endTime: 2, text: "Hello world" },
  { startTime: 2, endTime: 4, text: "This is a test" },
];

test("accepts a complete translation that differs from the source", () => {
  const translated = englishTranscript.map((segment, index) => ({
    ...segment,
    text_zh: index === 0 ? "你好，世界" : "这是一个测试",
  }));

  assert.equal(hasDisplayableTranslation(translated), true);
  assert.equal(hasCompleteTranslation(translated), true);
});

test("does not treat untranslated fallback text as Chinese translation", () => {
  const fallback = englishTranscript.map((segment) => ({
    ...segment,
    text_zh: segment.text,
  }));

  assert.equal(hasDisplayableTranslation(fallback), false);
  assert.equal(hasCompleteTranslation(fallback), false);
});

test("requires every segment before considering a translation complete", () => {
  const partial = [
    { ...englishTranscript[0], text_zh: "你好，世界" },
    englishTranscript[1],
  ];

  assert.equal(hasDisplayableTranslation(partial), true);
  assert.equal(hasCompleteTranslation(partial), false);
});

test("reuses partial cached translations without treating source-text fallbacks as translated", () => {
  const cached = [
    { ...englishTranscript[0], text_zh: "你好，世界" },
    { ...englishTranscript[1], text_zh: englishTranscript[1].text },
  ];

  const merged = mergeCachedTranslation(englishTranscript, cached);

  assert.deepEqual(merged, [
    { ...englishTranscript[0], text_zh: "你好，世界" },
    englishTranscript[1],
  ]);
  assert.equal(hasDisplayableTranslation(merged), true);
  assert.equal(hasCompleteTranslation(merged), false);
});

test("does not attach a cached translation to a different timestamp", () => {
  const merged = mergeCachedTranslation(englishTranscript, [
    { startTime: 9, endTime: 11, text: "Other sentence", text_zh: "另一句话" },
  ]);

  assert.deepEqual(merged, englishTranscript);
});
