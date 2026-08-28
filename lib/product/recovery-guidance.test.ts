import assert from "node:assert/strict";
import test from "node:test";
import { getRecoveryGuidance } from "./recovery-guidance";

test("maps missing captions to a safe alternative instead of a blind retry", () => {
  const guidance = getRecoveryGuidance("transcript", "NO_CAPTION_TRACKS");

  assert.equal(guidance.title, "没有可用字幕");
  assert.equal(guidance.primaryAction, "choose_video");
  assert.equal(guidance.secondaryAction, "open_youtube");
});

test("keeps transcript learning available when AI analysis is unavailable", () => {
  const guidance = getRecoveryGuidance("analysis", "ai_quota_exhausted");

  assert.equal(guidance.primaryAction, "continue_with_transcript");
  assert.match(guidance.title, /额度/);
  assert.match(guidance.message, /仅使用免费额度/);
});

test("keeps the user's question when chat is rate limited", () => {
  const guidance = getRecoveryGuidance("chat", "ai_rate_limited");

  assert.equal(guidance.primaryAction, "retry");
  assert.match(guidance.message, /问题已保留/);
});

test("gives translation failures a non-destructive retry", () => {
  const guidance = getRecoveryGuidance("translation", "unknown");

  assert.equal(guidance.primaryAction, "retry");
  assert.match(guidance.message, /不会覆盖/);
});

test("explains translation quota failures and keeps retry available", () => {
  const guidance = getRecoveryGuidance("translation", "ai_quota_exhausted");

  assert.equal(guidance.primaryAction, "retry");
  assert.match(guidance.title, /额度/);
  assert.match(guidance.message, /已完成的译文会保留/);
});
