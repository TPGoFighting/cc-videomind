export const FIRST_REVIEW_DELAY_MS = 24 * 60 * 60 * 1000;

export function createInitialReviewState(lemma: string, now = new Date()) {
  return {
    lemma,
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewAt: new Date(now.getTime() + FIRST_REVIEW_DELAY_MS).toISOString(),
    status: "learning",
  };
}
