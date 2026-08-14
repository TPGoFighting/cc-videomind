import { type TranscriptSegment } from "@/lib/types";
import { TranscriptError, type TranscriptProvider } from "@/lib/youtube/transcript-provider";

export class YoutubeTranscriptPackageProvider implements TranscriptProvider {
  async getTranscript(videoId: string, preferredLang?: string): Promise<TranscriptSegment[]> {
    // 动态导入，避免本地构建时 package 不存在的问题
    const { YoutubeTranscript } = await import("youtube-transcript");

    try {
      // 添加 15s 超时，防止永久挂起
      const result = await Promise.race([
        YoutubeTranscript.fetchTranscript(videoId, { lang: preferredLang ?? "en" }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("youtube-transcript 超时 (15s)")), 15_000)
        ),
      ]);

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
