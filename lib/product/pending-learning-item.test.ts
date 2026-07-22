import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPendingSaveLoginHref,
  decideLearningSave,
  parsePendingLearningItem,
  serializePendingLearningItem,
  type PendingLearningItem,
} from "./pending-learning-item";

const NOW = 1_800_000_000_000;

test("round-trips a pending quote without putting it in the return URL", () => {
  const item: PendingLearningItem = {
    kind: "quote",
    videoId: "eIho2S0ZahI",
    textEn: "Listening is a skill.",
    textZh: "倾听是一种技能。",
    startTime: 12,
    endTime: 18,
    createdAt: NOW,
  };

  assert.deepEqual(parsePendingLearningItem(serializePendingLearningItem(item), NOW), item);
});

test("rejects malformed, expired, and future pending items", () => {
  assert.equal(parsePendingLearningItem("not-json", NOW), null);
  assert.equal(parsePendingLearningItem(JSON.stringify({ kind: "word" }), NOW), null);
  assert.equal(parsePendingLearningItem(JSON.stringify({
    kind: "word",
    videoId: "eIho2S0ZahI",
    lemma: "listen",
    createdAt: NOW - 31 * 60 * 1000,
  }), NOW), null);
  assert.equal(parsePendingLearningItem(JSON.stringify({
    kind: "word",
    videoId: "eIho2S0ZahI",
    lemma: "listen",
    createdAt: NOW + 61_000,
  }), NOW), null);
});

test("allows anonymous learning but requests login only at the save boundary", () => {
  assert.equal(decideLearningSave({ fixture: false, authLoading: false, authenticated: false }), "queue_and_login");
  assert.equal(decideLearningSave({ fixture: false, authLoading: false, authenticated: true }), "persist");
  assert.equal(decideLearningSave({ fixture: true, authLoading: false, authenticated: false }), "preview");
});

test("return URL contains only the video identity and resume intent", () => {
  const href = buildPendingSaveLoginHref("eIho2S0ZahI");

  assert.equal(href, "/login?next=%2Fvideo%2FeIho2S0ZahI%3Fresume%3Dsave");
  assert.doesNotMatch(href, /Listening|倾听|textEn/);
});
