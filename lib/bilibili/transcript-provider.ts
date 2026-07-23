import type { TranscriptSegment } from "@/lib/types";
import { fetchBilibiliMetadata } from "@/lib/bilibili/metadata";
import type { TranscriptProvider } from "@/lib/youtube/transcript-provider";

export type BilibiliMetadata = Awaited<ReturnType<typeof fetchBilibiliMetadata>>;
export type BilibiliProgressEvent = "metadata" | "error";
export type BilibiliProgressData = BilibiliMetadata | { duration: number };
export type BilibiliProgressCallback = (event: BilibiliProgressEvent, data: BilibiliProgressData) => void;

export class BilibiliSubtitleImportRequiredError extends Error {
  readonly code = "bilibili_subtitle_import_required";

  constructor() {
    super("B 站链接需要导入 SRT、VTT 或 B 站 JSON 字幕；不自动提取公开视频音频。");
    this.name = "BilibiliSubtitleImportRequiredError";
  }
}

/**
 * Compatibility adapter for legacy callers. Public Bilibili URLs no longer
 * trigger subtitle scraping or audio extraction; callers must use the import
 * flow with user-provided, time-coded subtitles.
 */
export class BilibiliTranscriptProvider implements TranscriptProvider {
  async getTranscript(
    _videoId: string,
    _preferredLang?: string,
    _onProgress?: BilibiliProgressCallback,
  ): Promise<TranscriptSegment[]> {
    void _videoId;
    void _preferredLang;
    void _onProgress;
    throw new BilibiliSubtitleImportRequiredError();
  }
}
