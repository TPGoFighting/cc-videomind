import { type TranscriptSegment } from "@/lib/types";
import { TranscriptError, type TranscriptProvider } from "@/lib/youtube/transcript-provider";

export class YoutubeTranscriptPackageProvider implements TranscriptProvider {
  async getTranscript(videoId: string, preferredLang?: string): Promise<TranscriptSegment[]> {
    // 动态导入，避免本地构建时 package 不存在的问题
    const { YoutubeTranscript } = await import("youtube-transcript");

    try {
      const result = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: preferredLang ?? "en",
      });

      if (!result || result.length === 0) {
        throw new TranscriptError("CAPTION_DOWNLOAD_FAILED", "youtube-transcript 未返回字幕。");
      }

      return result.map((item) => ({
        startTime: item.offset / 1000,
        endTime: (item.offset + item.duration) / 1000,
        text: item.text,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      if (msg.includes("Transcript is disabled")) {
        throw new TranscriptError("NO_CAPTION_TRACKS", "此视频未启用字幕。");
      }
      if (msg.includes("Video is unavailable")) {
        throw new TranscriptError("PAGE_FETCH_FAILED", "视频不可用。");
      }

      throw new TranscriptError("CAPTION_DOWNLOAD_FAILED", `youtube-transcript 失败: ${msg}`);
    }
  }
}
