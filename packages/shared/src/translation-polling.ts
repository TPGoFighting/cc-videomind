export type TranslationPollSignal = {
  hasMore: boolean;
  sawDone: boolean;
  failedBatchCount: number;
  receivedUpdates: number;
};

export const TRANSLATION_POLL_INITIAL_DELAY_MS = 1_500;
export const TRANSLATION_POLL_MAX_DELAY_MS = 15_000;
export const TRANSLATION_POLL_MAX_ATTEMPTS = 32;

/**
 * A page can finish with partial output or without a terminal SSE frame.
 * Keep the worker alive while there are still local segments to resolve.
 */
export function shouldContinueTranslation(signal: TranslationPollSignal, pendingCount: number): boolean {
  if (pendingCount <= 0) return false;
  return signal.hasMore
    || signal.failedBatchCount > 0
    || !signal.sawDone
    || signal.receivedUpdates === 0
    // 服务端宣称当前页结束时，仍以客户端的未完成段数为准，给缓存同步
    // 和事件丢失留出一次自动恢复机会。
    || pendingCount > 0;
}

export function getTranslationPollDelay(attempt: number): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  return Math.min(
    TRANSLATION_POLL_MAX_DELAY_MS,
    TRANSLATION_POLL_INITIAL_DELAY_MS * (2 ** Math.min(safeAttempt, 4)),
  );
}

export function isRetryableTranslationFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;

  const candidate = error as { status?: unknown; code?: unknown; name?: unknown };
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  const code = typeof candidate.code === "string" ? candidate.code : "";

  if (code === "translation_stream_interrupted" || code === "network_error" || code === "timeout") {
    return true;
  }
  if (status === undefined || status === 0) return true;
  return status >= 500 || [408, 425, 429].includes(status);
}
