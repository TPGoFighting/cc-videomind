export const LEARNING_GUIDANCE_DISMISSED_KEY = "teach-player:learning-guidance-dismissed";

type BrowserStorage = Pick<Storage, "getItem" | "setItem">;

export function shouldShowLearningGuidance(storage: BrowserStorage | null): boolean {
  return storage?.getItem(LEARNING_GUIDANCE_DISMISSED_KEY) !== "dismissed" && storage !== null;
}

export function dismissLearningGuidance(storage: BrowserStorage | null): void {
  storage?.setItem(LEARNING_GUIDANCE_DISMISSED_KEY, "dismissed");
}
