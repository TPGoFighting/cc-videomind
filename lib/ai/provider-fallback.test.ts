import assert from "node:assert/strict";
import test from "node:test";
import { FallbackAiProvider, type AiProvider } from "@/lib/ai/provider";

function stubProvider(overrides: Partial<AiProvider>): AiProvider {
  return {
    generateAnalysis: async () => ({
      summary: "stub",
      takeaways: ["one", "two", "three"],
      suggestedQuestions: ["one", "two", "three"],
      highlights: [
        { startTime: 0, endTime: 1, title: "one", quote: "one", reason: "one" },
        { startTime: 1, endTime: 2, title: "two", quote: "two", reason: "two" },
        { startTime: 2, endTime: 3, title: "three", quote: "three", reason: "three" },
      ],
    }),
    answerQuestion: async () => ({
      answer: "stub",
      citations: [],
      diagnostics: { jsonParseMode: "direct", citationNormalized: false },
    }),
    generateKeyMoments: async () => [],
    generateStructuredSummary: async () => [],
    generateComprehensiveAnalysis: async () => ({
      summary: "stub",
      takeaways: [],
      moments: [],
      highlights: [],
      suggestedQuestions: [],
    }),
    defineWords: async () => [],
    translateTranscript: async () => [],
    generateGrammarAnalysis: async ({ sentence }) => ({
      sentence,
      translation: "stub",
      posTags: [{ word: "stub", pos: "noun", color: "#3B82F6" }],
      structure: "stub",
      explanation: "stub",
    }),
    ...overrides,
  };
}

test("falls back to the secondary provider when the primary provider is unavailable", async () => {
  const primary = stubProvider({
    translateTranscript: async () => {
      throw new Error("primary quota exhausted");
    },
  });
  const fallback = stubProvider({
    translateTranscript: async ({ segments }) => segments.map((segment) => ({
      ...segment,
      text_zh: "备用译文",
    })),
  });

  const provider = new FallbackAiProvider(primary, fallback);
  const result = await provider.translateTranscript({
    segments: [{ startTime: 0, endTime: 1, text: "Hello" }],
    targetLanguage: "zh-CN",
  });

  assert.equal(result[0]?.text_zh, "备用译文");
});

test("surfaces the secondary provider error when both providers fail", async () => {
  const primary = stubProvider({
    generateAnalysis: async () => {
      throw new Error("primary failed");
    },
  });
  const fallback = stubProvider({
    generateAnalysis: async () => {
      throw new Error("fallback failed");
    },
  });

  await assert.rejects(
    () => new FallbackAiProvider(primary, fallback).generateAnalysis({ title: "title", transcript: [] }),
    /fallback failed/,
  );
});
