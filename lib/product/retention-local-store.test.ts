import assert from "node:assert/strict";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const databasePath = join(tmpdir(), `teach-player-retention-${process.pid}.sqlite`);
process.env.SQLITE_PATH = databasePath;

test("local retention store keeps words, quotes, cadence, and deletion state coherent", async (t) => {
  const store = await import("@/lib/db/local-store");
  t.after(async () => {
    await store.closeDb();
    if (existsSync(databasePath)) unlinkSync(databasePath);
  });

  await store.saveVocabulary([{
    word: "listen",
    videoId: "eIho2S0ZahI",
    sourceTime: 42.5,
    definitionZh: "倾听",
  }]);
  const vocabulary = await store.loadVocabulary();
  const word = vocabulary[0];
  assert.ok(word);
  assert.equal(word.sourceTime, 42.5);
  await store.saveReviewState({
    lemma: word.word,
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewAt: "2020-01-01T00:00:00.000Z",
    status: "learning",
  });

  const quoteId = await store.saveQuote({
    videoId: "eIho2S0ZahI",
    textEn: "Listening is a skill.",
    textZh: "倾听是一种技能。",
    startTime: 12,
    endTime: 18,
    videoTitle: "Listening well",
  });
  await store.saveQuoteReviewState({
    quoteId,
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewAt: "2020-01-01T00:00:00.000Z",
    status: "learning",
  });
  await store.saveLocalReviewCadence("focused");

  const [dueWords, dueQuotes, cadence] = await Promise.all([
    store.getDueReviewWords(),
    store.getDueReviewQuotes(),
    store.getLocalReviewCadence(),
  ]);
  assert.equal(dueWords[0]?.id, word.id);
  assert.equal(dueWords[0]?.sourceTime, 42.5);
  assert.equal(dueQuotes[0]?.id, quoteId);
  assert.equal(dueQuotes[0]?.startTime, 12);
  assert.equal(cadence, "focused");

  await store.deleteVocabulary(word.id);
  await store.deleteQuote(quoteId);
  assert.equal(await store.getReviewState(word.word), null);
  assert.equal(await store.getQuoteReviewState(quoteId), null);
});
