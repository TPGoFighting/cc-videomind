import assert from "node:assert/strict";
import { test } from "node:test";
import type { TranscriptSegment } from "@/lib/types";
import {
  buildGrammarAnalysisPrompt,
  buildTranscriptTranslationPrompt,
  parseIndexedTranslation,
} from "@/lib/ai/prompts-learn";

const segments: TranscriptSegment[] = [
  { startTime: 0, endTime: 2, text: "The codebase is hard to change." },
  { startTime: 2, endTime: 4, text: "Good tests make feedback faster." },
];

test("translation prompt uses numbered lines and JSON output", () => {
  const prompt = buildTranscriptTranslationPrompt(segments);
  assert.match(prompt, /1\. The codebase is hard to change\./);
  assert.match(prompt, /Output only a valid JSON array of 2 strings/);
  assert.doesNotMatch(prompt, /INPUT_0|OUTPUT_0/);
});

test("grammar prompt requires grounded structured output", () => {
  const prompt = buildGrammarAnalysisPrompt("The tests make feedback faster.");
  assert.match(prompt, /posTags/);
  assert.match(prompt, /structure/);
  assert.match(prompt, /输出纯 JSON/);
  assert.match(prompt, /The tests make feedback faster\./);
});

test("translation parser accepts a fenced JSON array", () => {
  const response = [
    "```json",
    "[\"代码库很难修改。\", \"良好的测试让反馈更快。\"]",
    "```",
  ].join("\n");
  const parsed = parseIndexedTranslation(response, 2);
  assert.deepEqual([...parsed.entries()], [[0, "代码库很难修改。"], [1, "良好的测试让反馈更快。"]]);
});

test("translation parser keeps the legacy indexed format", () => {
  const parsed = parseIndexedTranslation("[OUTPUT_0]第一句[/OUTPUT_0]\n[OUTPUT_1]第二句[/OUTPUT_1]", 2);
  assert.deepEqual([...parsed.entries()], [[0, "第一句"], [1, "第二句"]]);
});
