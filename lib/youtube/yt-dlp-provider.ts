import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { type TranscriptSegment } from "@/lib/types";
import {
  TranscriptProvider,
  TranscriptError,
  parseCaptionContent,
  mergeIntoSentences,
} from "./transcript-provider";

/**
 * YtDlpTranscriptProvider — 本地优先的字幕提取器
 *
 * 思路（第一性原理）：用户本机直连 YouTube，不存在服务器取数的墙与反爬问题。
 * 直接用用户本机的 yt-dlp（带浏览器 cookie）拉取字幕，是本地工具最稳的一条路，
 * 也绕开了 InnerTube / HTML 抓取在受限网络下被 bot 拦截的困境。
 *
 * 后续在 Tauri 桌面版中，yt-dlp 会作为 Rust sidecar 打包，由 Rust 命令调用并返回
 * JSON；本 Provider 的 Node 版本在 `next dev` 本地开发与过渡期复用同一套解析逻辑。
 */

const YTDLP_CANDIDATES: string[][] = [
  ["yt-dlp"],
  ["python3", "-m", "yt_dlp"],
  ["python", "-m", "yt_dlp"],
];

function isMissingBinary(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message ?? "";
  return code === "ENOENT" || /ENOENT/i.test(message);
}

export interface YtDlpOptions {
  /** 浏览器 cookie 来源，默认 chrome。设为 null 禁用 cookie。 */
  cookiesFromBrowser?: string | null;
  /** cookies.txt 文件路径，优先于 cookiesFromBrowser */
  cookiesFile?: string | null;
  preferredLang?: string;
  /** 超时（毫秒） */
  timeoutMs?: number;
}

export interface YtDlpMetadata {
  title: string;
  authorName?: string;
  thumbnailUrl?: string;
  providerUrl: string;
}

export class YtDlpTranscriptProvider implements TranscriptProvider {
  constructor(private readonly opts: YtDlpOptions = {}) {}

  async getTranscript(videoId: string, preferredLang = "en"): Promise<TranscriptSegment[]> {
    const binary = await this.resolveBinary();
    if (!binary) {
      throw new TranscriptError(
        "PAGE_FETCH_FAILED",
        "未找到 yt-dlp，请先安装（pip install yt-dlp）或设置 YTDLP_COMMAND 环境变量。"
      );
    }

    const outDir = await fs.mkdtemp(path.join(tmpdir(), "tp-ytdlp-"));
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const lang = (preferredLang || "en").split("-")[0];

    const args = [
      watchUrl,
      "--skip-download",
      "--write-auto-subs",
      "--write-subs",
      "--sub-lang", lang,
      "--sub-format", "json3",
      "--no-warnings",
      "--no-progress",
      "--no-playlist",
      "-o", path.join(outDir, "%(id)s.%(ext)s"),
    ];

    const cookiesFromBrowser =
      this.opts.cookiesFromBrowser ?? process.env.YTDLP_COOKIES_FROM_BROWSER ?? "chrome";
    const cookiesFile = this.opts.cookiesFile ?? process.env.YTDLP_COOKIES_FILE ?? "";

    if (cookiesFile) {
      args.unshift("--cookies", cookiesFile);
    } else if (cookiesFromBrowser) {
      args.unshift("--cookies-from-browser", cookiesFromBrowser);
    }

    try {
      await this.run(binary, args);
      const file = await this.findSubtitleFile(outDir);
      if (!file) {
        throw new TranscriptError(
          "NO_CAPTION_TRACKS",
          `yt-dlp 未获取到 ${lang} 字幕（该视频可能无此语言字幕，或 cookie 已失效）。`
        );
      }
      const raw = await fs.readFile(path.join(outDir, file), "utf-8");
      const segments = this.parse(raw);
      if (segments.length === 0) {
        throw new TranscriptError("CAPTION_DOWNLOAD_FAILED", "yt-dlp 获取到字幕文件但解析为空。");
      }
      return segments;
    } finally {
      await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /** Read lightweight video metadata through the same local yt-dlp path. */
  async getMetadata(videoId: string): Promise<YtDlpMetadata> {
    const binary = await this.resolveBinary();
    if (!binary) {
      throw new TranscriptError(
        "PAGE_FETCH_FAILED",
        "未找到 yt-dlp，请先安装（pip install yt-dlp）或设置 YTDLP_COMMAND 环境变量。"
      );
    }

    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const args = [
      watchUrl,
      "--skip-download",
      "--dump-single-json",
      "--no-warnings",
      "--no-progress",
      "--no-playlist",
    ];

    const cookiesFromBrowser =
      this.opts.cookiesFromBrowser ?? process.env.YTDLP_COOKIES_FROM_BROWSER ?? "chrome";
    const cookiesFile = this.opts.cookiesFile ?? process.env.YTDLP_COOKIES_FILE ?? "";

    if (cookiesFile) {
      args.unshift("--cookies", cookiesFile);
    } else if (cookiesFromBrowser) {
      args.unshift("--cookies-from-browser", cookiesFromBrowser);
    }

    const { stdout } = await this.run(binary, args);
    try {
      const data = JSON.parse(stdout) as {
        title?: unknown;
        uploader?: unknown;
        channel?: unknown;
        thumbnail?: unknown;
        webpage_url?: unknown;
      };
      if (typeof data.title !== "string" || !data.title.trim()) {
        throw new Error("missing title");
      }
      return {
        title: data.title.trim(),
        authorName:
          typeof data.uploader === "string"
            ? data.uploader
            : typeof data.channel === "string"
              ? data.channel
              : undefined,
        thumbnailUrl: typeof data.thumbnail === "string" ? data.thumbnail : undefined,
        providerUrl: typeof data.webpage_url === "string" ? data.webpage_url : watchUrl,
      };
    } catch {
      throw new TranscriptError("PAGE_FETCH_FAILED", "yt-dlp 未返回可用的视频元数据。");
    }
  }

  /** 探测可用二进制：优先 YTDLP_COMMAND，否则依次尝试候选列表 */
  private async resolveBinary(): Promise<string[] | null> {
    const env = process.env.YTDLP_COMMAND?.trim();
    if (env) return env.split(/\s+/);

    for (const cand of YTDLP_CANDIDATES) {
      try {
        await this.run(cand, ["--version"]);
        return cand;
      } catch (err) {
        if (!isMissingBinary(err)) {
          // 命令存在但 --version 异常，仍尝试用它
          return cand;
        }
      }
    }
    return null;
  }

  private run(
    cmd: string[],
    args: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const timeout = this.opts.timeoutMs ?? 90_000;
      execFile(
        cmd[0],
        [...cmd.slice(1), ...args],
        { maxBuffer: 64 * 1024 * 1024, timeout },
        (err, stdout, stderr) => {
          if (err) {
            // 缺失二进制（ENOENT）保留原始错误，供 resolveBinary 识别并切换到下一候选
            if ((err as { code?: string }).code === "ENOENT") {
              reject(err);
              return;
            }
            const msg = (stderr?.toString?.() || err.message || "").slice(0, 400);
            reject(new TranscriptError("PAGE_FETCH_FAILED", `yt-dlp 执行失败：${msg}`));
            return;
          }
          resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
        }
      );
    });
  }

  private async findSubtitleFile(outDir: string): Promise<string | null> {
    const files = await fs.readdir(outDir);
    const json3 = files.filter((f) => f.endsWith(".json3"));
    return json3[0] ?? null;
  }

  private parse(raw: string): TranscriptSegment[] {
    const rawSegments = parseCaptionContent(raw)
      .filter((s) => s.text.length > 0 && Number.isFinite(s.start) && Number.isFinite(s.duration))
      .map((s) => ({
        startTime: s.start,
        endTime: s.start + s.duration,
        text: s.text,
      }));
    return mergeIntoSentences(rawSegments);
  }
}
