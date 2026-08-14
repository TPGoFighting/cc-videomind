import type { TranscriptSegment } from "@/lib/types";

const MAX_SEGMENTS = 10_000;
const MAX_TEXT_LENGTH = 2_000;

export class SubtitleImportError extends Error {
  constructor(
    public readonly code: "unsupported_format" | "timecodes_required" | "invalid_subtitle",
    message: string,
  ) {
    super(message);
    this.name = "SubtitleImportError";
  }
}

export type SubtitleImportResult = {
  segments: TranscriptSegment[];
  sourceFormat: "bilibili_json" | "srt" | "vtt";
};

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTimestamp(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const parts = normalized.split(":");
  if (parts.length !== 2 && parts.length !== 3) {
    throw new SubtitleImportError("invalid_subtitle", "字幕时间格式无效。");
  }

  const seconds = Number(parts.at(-1));
  const minutes = Number(parts.at(-2));
  const hours = parts.length === 3 ? Number(parts[0]) : 0;
  if (
    !Number.isFinite(seconds) || !Number.isFinite(minutes) || !Number.isFinite(hours) ||
    seconds < 0 || seconds >= 60 || minutes < 0 || minutes >= 60 || hours < 0
  ) {
    throw new SubtitleImportError("invalid_subtitle", "字幕时间格式无效。");
  }
  return hours * 3600 + minutes * 60 + seconds;
}

function validateSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  if (segments.length === 0) {
    throw new SubtitleImportError("invalid_subtitle", "没有找到可用的带时间轴字幕。");
  }
  if (segments.length > MAX_SEGMENTS) {
    throw new SubtitleImportError("invalid_subtitle", "字幕片段过多，请拆分后再导入。");
  }

  return segments.map((segment) => {
    const text = cleanText(segment.text);
    if (!text || text.length > MAX_TEXT_LENGTH || segment.startTime < 0 || segment.endTime <= segment.startTime) {
      throw new SubtitleImportError("invalid_subtitle", "字幕中包含空文本或无效时间范围。");
    }
    return {
      startTime: Number(segment.startTime.toFixed(3)),
      endTime: Number(segment.endTime.toFixed(3)),
      text,
    };
  });
}

function parseTimedText(content: string): TranscriptSegment[] {
  const lines = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const segments: TranscriptSegment[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const timing = lines[index].match(/^\s*(.+?)\s+-->\s+(.+?)\s*$/);
    if (!timing) continue;

    const startTime = parseTimestamp(timing[1]);
    const endToken = timing[2].trim().split(/\s+/)[0] ?? "";
    const endTime = parseTimestamp(endToken);
    const textLines: string[] = [];
    index += 1;
    while (index < lines.length && lines[index].trim()) {
      textLines.push(lines[index]);
      index += 1;
    }
    segments.push({ startTime, endTime, text: textLines.join(" ") });
  }

  return validateSegments(segments);
}

function parseBilibiliJson(content: string): TranscriptSegment[] {
  let raw: unknown;
  try {
    raw = JSON.parse(content) as unknown;
  } catch {
    throw new SubtitleImportError("invalid_subtitle", "字幕 JSON 无法解析。");
  }

  const body = raw && typeof raw === "object" && "body" in raw
    ? (raw as { body?: unknown }).body
    : null;
  if (!Array.isArray(body)) {
    throw new SubtitleImportError("invalid_subtitle", "该 JSON 不是 B 站字幕导出格式。");
  }

  const segments = body.map((item) => {
    if (!item || typeof item !== "object") {
      throw new SubtitleImportError("invalid_subtitle", "字幕中包含无效片段。");
    }
    const { from, to, content: text } = item as { from?: unknown; to?: unknown; content?: unknown };
    if (typeof from !== "number" || typeof to !== "number" || typeof text !== "string") {
      throw new SubtitleImportError("invalid_subtitle", "字幕中包含无效片段。");
    }
    return { startTime: from, endTime: to, text };
  });

  return validateSegments(segments);
}

export function parseSubtitleImport(input: { filename: string; content: string }): SubtitleImportResult {
  const filename = input.filename.trim().toLowerCase();
  if (!input.content.trim()) {
    throw new SubtitleImportError("invalid_subtitle", "字幕文件为空。");
  }
  if (filename.endsWith(".json")) {
    return { segments: parseBilibiliJson(input.content), sourceFormat: "bilibili_json" };
  }
  if (filename.endsWith(".srt")) {
    return { segments: parseTimedText(input.content), sourceFormat: "srt" };
  }
  if (filename.endsWith(".vtt")) {
    return { segments: parseTimedText(input.content), sourceFormat: "vtt" };
  }
  if (filename.endsWith(".txt")) {
    throw new SubtitleImportError("timecodes_required", "TXT 没有可靠时间轴，请上传 SRT、VTT 或 B 站 JSON 字幕。");
  }
  throw new SubtitleImportError("unsupported_format", "仅支持 SRT、VTT 和 B 站 JSON 字幕文件。");
}
