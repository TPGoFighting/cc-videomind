import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectChatEvidence, validateChatCitations } from "@/lib/product/chat-evidence";
import { ChatAnswerSchema } from "@/lib/types";

const transcript = [
  { startTime: 0, endTime: 6, text: "The opening explains why habits are hard to change." },
  { startTime: 3180, endTime: 3192, text: "At minute fifty-three, the speaker names spaced repetition as the study method." },
  { startTime: 3200, endTime: 3210, text: "It works by revisiting material just before it is forgotten." },
];

const shortTranscript = [
  { startTime: 4, endTime: 9, text: "A control group does not receive the intervention." },
  { startTime: 10, endTime: 16, text: "That lets researchers compare the outcome fairly." },
];

const bilingualTranscript = [
  { startTime: 1800, endTime: 1810, text: "Spaced repetition means 间隔重复：在快忘记时复习。" },
  { startTime: 1811, endTime: 1820, text: "The speaker says it improves long-term retention, 长期记忆会更稳固。" },
];

describe("chat evidence contract", () => {
  it("finds late-video evidence with real source timestamps", () => {
    const evidence = selectChatEvidence("Which study method is named at minute fifty-three?", transcript);
    assert.equal(evidence.found, true);
    assert.ok(evidence.segments.some((segment) => segment.startTime === 3180));
  });

  it("keeps the surrounding source context for a matched late-video claim", () => {
    const evidence = selectChatEvidence("What does spaced repetition do?", transcript);
    assert.deepEqual(evidence.segments.map((segment) => segment.startTime), [3180, 3200]);
  });

  it("rejects unsupported questions and fabricated citations", () => {
    assert.equal(selectChatEvidence("What is the capital of France?", transcript).found, false);
    assert.deepEqual(validateChatCitations([
      { startTime: 999, endTime: 1005, quote: "made up evidence" },
    ], transcript), []);
  });

  it("allows an explicit no-evidence answer without inventing a citation", () => {
    assert.equal(ChatAnswerSchema.safeParse({
      answer: "无法从视频字幕中证实这个问题。",
      citations: [],
    }).success, true);
  });

  it("retrieves a short English answer window", () => {
    const evidence = selectChatEvidence("What does a control group not receive?", shortTranscript);
    assert.deepEqual(evidence.segments.map((segment) => segment.startTime), [4, 10]);
  });

  it("retrieves a late bilingual answer window from a Chinese question", () => {
    const evidence = selectChatEvidence("间隔重复有什么作用？", bilingualTranscript);
    assert.deepEqual(evidence.segments.map((segment) => segment.startTime), [1800, 1811]);
  });
});
