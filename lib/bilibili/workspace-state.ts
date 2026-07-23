/**
 * Direct Bilibili videos have no server-side scraping fallback. Keep their
 * recovery state separate from transient YouTube/provider failures so the UI
 * leads with the one action that can actually succeed: user subtitle import.
 */
export function shouldShowBilibiliImport(errorCode: string | null, isDirectBilibiliVideo: boolean): boolean {
  return isDirectBilibiliVideo && errorCode === "bilibili_subtitle_import_required";
}
