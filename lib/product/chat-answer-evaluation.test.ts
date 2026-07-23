import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateChatAnswerFixture } from "@/lib/product/chat-answer-evaluation";

const transcript = [
  { startTime: 3180, endTime: 3192, text: "At minute fifty-three, the speaker names spaced repetition as the study method." },
  { startTime: 3200, endTime: 3210, text: "It works by revisiting material just before it is forgotten." },
];

describe("saved chat answer evaluation", () => {
  it("accepts an answer whose required claim and source quote are both present", () => {
    const result = evaluateChatAnswerFixture({
      answer: "The method is spaced repetition: revisit material just before it is forgotten.",
      citations: [{ startTime: 3180, endTime: 3192, quote: "the speaker names spaced repetition as the study method" }],
    }, transcript, {
      answerMustContain: ["spaced repetition", "revisit material"],
      citationMustContain: ["spaced repetition"],
    });

    assert.deepEqual(result, { passed: true, issues: [] });
  });

  it("flags an answer claim that is not in the approved fixture", () => {
    const result = evaluateChatAnswerFixture({
      answer: "The method is active recall.",
      citations: [{ startTime: 3180, endTime: 3192, quote: "spaced repetition" }],
    }, transcript, {
      answerMustContain: ["spaced repetition"],
      citationMustContain: ["spaced repetition"],
    });

    assert.deepEqual(result, { passed: false, issues: ["answer_missing:spaced repetition"] });
  });

  it("flags a fabricated source quote even if the answer looks plausible", () => {
    const result = evaluateChatAnswerFixture({
      answer: "The method is spaced repetition.",
      citations: [{ startTime: 999, endTime: 1000, quote: "active recall is the method" }],
    }, transcript, {
      answerMustContain: ["spaced repetition"],
      citationMustContain: ["spaced repetition"],
    });

    assert.deepEqual(result, { passed: false, issues: ["citation_not_in_transcript", "citation_missing:spaced repetition"] });
  });

  it("accepts an explicit no-evidence refusal with no citations", () => {
    const result = evaluateChatAnswerFixture({
      answer: "无法从视频字幕中证实这个问题。",
      citations: [],
    }, transcript, {
      shouldRefuse: true,
      refusalMustContain: "无法从视频字幕中证实",
    });

    assert.deepEqual(result, { passed: true, issues: [] });
  });

  it("flags an unsupported answer that invents a citation instead of refusing", () => {
    const result = evaluateChatAnswerFixture({
      answer: "France 的首都是巴黎。",
      citations: [{ startTime: 3180, endTime: 3192, quote: "spaced repetition" }],
    }, transcript, {
      shouldRefuse: true,
      refusalMustContain: "无法从视频字幕中证实",
    });

    assert.deepEqual(result, {
      passed: false,
      issues: ["refusal_missing:无法从视频字幕中证实", "refusal_has_citations"],
    });
  });
});
