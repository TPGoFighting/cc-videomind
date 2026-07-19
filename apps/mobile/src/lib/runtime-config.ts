export const DEFAULT_API_BASE_URL = "https://video.tpgofighting.top";

function normalizeApiBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/$/, "");
  const url = new URL(normalized);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must use http or https.");
  }

  return normalized;
}

/**
 * Every network surface uses this value so an Android build cannot mix a
 * production API with an emulator-only playback endpoint.
 */
export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL);
}
