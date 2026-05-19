import {
  KeyMomentSchema,
  SummaryTakeawaySchema,
  type KeyMoment,
  type SummaryTakeaway,
  type TranscriptSegment
} from "@/lib/types";
import { extractBalancedJson, repairBrokenJson } from "@/lib/utils/json";

// ====== 时间戳转换 ======

/** 将 "M:SS", "MM:SS", "HH:MM:SS" 转为秒数 */
export function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(ts) || 0;
}

/** 将秒数转为 "M:SS" */
export function secondsToTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 解析 "MM:SS-MM:SS" 为 [startSeconds, endSeconds] */
export function parseTimestampRange(range: string): [number, number] | null {
  const parts = range.split("-");
  if (parts.length !== 2) return null;
  const start = parseTimestampToSeconds(parts[0]);
  const end = parseTimestampToSeconds(parts[1]);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return [start, end];
}

/** 检查两个时间范围是否重叠 */
export function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

// ====== 文本规范化 ======

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[，。！？、；：""''（）【】《》\s.,!?;:'"()\[\]{}<>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ====== 引文验证 ======

/**
 * 检查 quote 是否能在字幕中找到（模糊匹配）
 * 优先在 [startTime-5s, endTime+5s] 范围搜索，找不到则全字幕搜索
 */
export function verifyQuoteInTranscript(
  quote: string,
  startTime: number,
  endTime: number,
  transcript: TranscriptSegment[],
  toleranceSeconds = 5
): boolean {
  const normalizedQuote = normalizeText(quote);
  if (normalizedQuote.length < 5) return false;

  const t1 = startTime - toleranceSeconds;
  const t2 = endTime + toleranceSeconds;

  // 先搜时间范围
  const nearbySegments = transcript.filter(
    (s) => s.endTime >= t1 && s.startTime <= t2
  );

  if (fuzzyMatch(normalizedQuote, nearbySegments.map((s) => s.text))) {
    return true;
  }

  // 全字幕回退
  return fuzzyMatch(normalizedQuote, transcript.map((s) => s.text));
}

/** 子序列模糊匹配：检查 quote 的字符是否按顺序出现在任一文本中（80% 覆盖率） */
function fuzzyMatch(normalizedQuote: string, texts: string[]): boolean {
  const combined = texts.map((t) => normalizeText(t)).join(" ");

  // 子序列匹配
  let qi = 0;
  for (let ci = 0; ci < combined.length && qi < normalizedQuote.length; ci++) {
    if (combined[ci] === normalizedQuote[qi]) qi++;
  }

  return qi >= normalizedQuote.length * 0.7;
}

// ====== 解析 AI 输出 ======

/**
 * 解析 AI 返回的 JSON 为 KeyMoment 数组
 * 带 JSON 修复，不合格的条目静默丢弃
 */
export function parseKeyMoments(raw: string): KeyMoment[] {
  try {
    const value = parseJsonSafe(raw);
    if (!value) return [];

    // 支持 { moments: [...] } 或直接数组
    const items = isRecord(value) && Array.isArray(value.moments)
      ? value.moments
      : Array.isArray(value)
        ? value
        : [];

    return items
      .filter(isRecord)
      .map(normalizeKeyMoment)
      .filter((m): m is KeyMoment => m !== null);
  } catch {
    return [];
  }
}

function normalizeKeyMoment(raw: Record<string, unknown>): KeyMoment | null {
  // 如果 timestamp 是数字格式，转换
  let timestamp = getString(raw, ["timestamp", "time", "range"]);
  if (!timestamp) {
    const start = getNumber(raw, ["startTime", "start", "start_time", "startSeconds"]);
    const end = getNumber(raw, ["endTime", "end", "end_time", "endSeconds"]);
    if (start !== null && end !== null) {
      timestamp = `${secondsToTimestamp(start)}-${secondsToTimestamp(end)}`;
    } else if (start !== null) {
      timestamp = `${secondsToTimestamp(start)}-${secondsToTimestamp(start + 30)}`;
    } else {
      return null;
    }
  }

  const quote = getString(raw, ["quote", "text", "excerpt"]) ?? "";
  const title = getString(raw, ["title", "heading", "name"]) ?? "";
  const reason = getString(raw, ["reason", "explanation", "description", "note"]) ?? "";

  if (!title || !quote || !reason) return null;

  const parsed = KeyMomentSchema.safeParse({ title, timestamp, quote, reason });
  return parsed.success ? parsed.data : null;
}

/**
 * 解析 AI 返回的 JSON 为 SummaryTakeaway 数组
 */
export function parseSummaryTakeaways(raw: string): SummaryTakeaway[] {
  try {
    const value = parseJsonSafe(raw);
    if (!value) return [];

    const items = isRecord(value) && Array.isArray(value.takeaways)
      ? value.takeaways
      : Array.isArray(value)
        ? value
        : [];

    return items
      .filter(isRecord)
      .map(normalizeTakeaway)
      .filter((t): t is SummaryTakeaway => t !== null);
  } catch {
    return [];
  }
}

function normalizeTakeaway(raw: Record<string, unknown>): SummaryTakeaway | null {
  const label = getString(raw, ["label", "title", "heading"]) ?? "";
  const insight = getString(raw, ["insight", "description", "detail", "body"]) ?? "";

  let timestamps: string[] = [];
  const rawTs = raw.timestamps;
  if (Array.isArray(rawTs)) {
    timestamps = rawTs.filter((t): t is string => typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t));
  } else if (typeof raw.timestamp === "string") {
    timestamps = [raw.timestamp].filter((t) => /^\d{1,2}:\d{2}$/.test(t));
  }

  if (!label || !insight || timestamps.length === 0) return null;

  const parsed = SummaryTakeawaySchema.safeParse({ label, insight, timestamps: timestamps.slice(0, 2) });
  return parsed.success ? parsed.data : null;
}

// ====== 去重与验证 ======

/**
 * 验证并去重 moments：
 * 1. 验引文存在性
 * 2. 时间段重叠去重
 * 3. 相似引文去重
 * 4. 按开始时间排序
 */
export function validateAndDedupMoments(
  moments: KeyMoment[],
  transcript: TranscriptSegment[]
): KeyMoment[] {
  // 1. 引文验证
  const withValidQuotes = moments.filter((m) => {
    const range = parseTimestampRange(m.timestamp);
    if (!range) return false;
    return verifyQuoteInTranscript(m.quote, range[0], range[1], transcript);
  });

  // 2. 时间段重叠去重
  const deduped: KeyMoment[] = [];
  for (const m of withValidQuotes) {
    const range = parseTimestampRange(m.timestamp);
    if (!range) continue;

    const overlaps = deduped.findIndex((d) => {
      const dRange = parseTimestampRange(d.timestamp);
      return dRange ? rangesOverlap(range, dRange) : false;
    });

    if (overlaps === -1) {
      deduped.push(m);
    } else {
      // 保留 quote 更长的
      const existing = deduped[overlaps];
      if (m.quote.length > existing.quote.length) {
        deduped[overlaps] = m;
      }
    }
  }

  // 3. 相似引文去重（保守：>85% 相似度才合并）
  const final: KeyMoment[] = [];
  for (const m of deduped) {
    const similar = final.findIndex((f) => {
      const n1 = normalizeText(m.quote);
      const n2 = normalizeText(f.quote);
      // Jaccard 相似度（基于 3-gram）
      return ngramSimilarity(n1, n2, 3) > 0.85;
    });

    if (similar === -1) {
      final.push(m);
    } else {
      // 保留 title 更具体的
      if (m.title.length > final[similar].title.length) {
        final[similar] = m;
      }
    }
  }

  // 4. 按开始时间排序
  final.sort((a, b) => {
    const ra = parseTimestampRange(a.timestamp);
    const rb = parseTimestampRange(b.timestamp);
    return (ra?.[0] ?? 0) - (rb?.[0] ?? 0);
  });

  return final.slice(0, 5);
}

/**
 * 验证摘要 takeaways 的时间戳引用是否真实存在
 */
export function validateSummaryTakeaways(
  takeaways: SummaryTakeaway[],
  transcript: TranscriptSegment[],
  toleranceSeconds = 5
): SummaryTakeaway[] {
  return takeaways
    .map((t) => ({
      ...t,
      timestamps: t.timestamps.filter((ts) => {
        const seconds = parseTimestampToSeconds(ts);
        return transcript.some(
          (s) =>
            Math.abs(s.startTime - seconds) <= toleranceSeconds ||
            (seconds >= s.startTime && seconds <= s.endTime)
        );
      })
    }))
    .filter((t) => t.timestamps.length > 0);
}

// ====== 工具函数 ======

function ngramSimilarity(a: string, b: string, n: number): number {
  const ngramsA = getNgrams(a, n);
  const ngramsB = getNgrams(b, n);
  if (ngramsA.size === 0 && ngramsB.size === 0) return 1;
  const intersection = new Set([...ngramsA].filter((x) => ngramsB.has(x)));
  const union = new Set([...ngramsA, ...ngramsB]);
  return intersection.size / union.size;
}

function getNgrams(text: string, n: number): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i <= text.length - n; i++) {
    set.add(text.slice(i, i + n));
  }
  return set;
}

function parseJsonSafe(raw: string): unknown {
  try { return JSON.parse(raw); } catch { /* continue */ }
  const extracted = extractBalancedJson(raw);
  if (extracted) {
    try { return JSON.parse(extracted); } catch { /* continue */ }
    const repaired = repairBrokenJson(extracted);
    if (repaired) {
      try { return JSON.parse(repaired); } catch { /* continue */ }
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}
