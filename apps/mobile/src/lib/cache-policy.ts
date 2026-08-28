import { storage } from "./storage";

/**
 * Mobile cache policy mirrors the shared server cache:
 * - transcript: 30 days because the source captions are stable
 * - AI-derived analysis: 7 days so refreshed model output can eventually land
 * - translation: 30 days and reused by video id + language on the server
 */
export const MOBILE_CACHE_POLICY = {
  transcriptMs: 30 * 24 * 60 * 60 * 1000,
  analysisMs: 7 * 24 * 60 * 60 * 1000,
  translationMs: 30 * 24 * 60 * 60 * 1000,
} as const;

const DEFAULT_NETWORK_STALE_TIME_MS = 5 * 60 * 1000;

export function cacheTimestampKey(resourceKey: string): string {
  return `${resourceKey}:cached-at`;
}

export function markCacheUpdated(resourceKey: string, now = Date.now()): void {
  storage.set(cacheTimestampKey(resourceKey), now);
}

/**
 * Return the remaining client freshness window. Legacy raw cache entries have
 * no timestamp; they are treated as fresh once and receive a timestamp on
 * the next successful write.
 */
export function getCacheStaleTime(
  resourceKey: string,
  ttlMs: number,
  now = Date.now(),
): number {
  const cachedAt = storage.get<number | null>(cacheTimestampKey(resourceKey), null);
  if (!Number.isFinite(cachedAt)) return ttlMs;

  const age = Math.max(0, now - Number(cachedAt));
  return Math.max(0, ttlMs - age);
}

export const networkStaleTimeMs = DEFAULT_NETWORK_STALE_TIME_MS;
