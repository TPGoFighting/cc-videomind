const inFlight = new Map<string, Promise<unknown>>();

/**
 * Shares an expensive operation with concurrent callers for the same key.
 * This prevents a burst of users opening one video from creating duplicate
 * AI requests while the durable database cache is still being populated.
 */
export function runSingleFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = Promise.resolve().then(work);
  inFlight.set(key, promise);
  void promise.finally(() => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  }).catch(() => undefined);

  return promise;
}
