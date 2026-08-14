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
    if (!value) {
      console.warn("[Parse:Moments] parseJsonSafe 返回 null/undefined, 原始文本前200字: %s", raw.slice(0, 200));
      return [];
    }

    // 支持 { moments: [...] } 或直接数组
    const items = isRecord(value) && Array.isArray(value.moments)
      ? value.moments
      : Array.isArray(value)
        ? value
        : [];

    console.log("[Parse:Moments] JSON 解析成功, items 数量: %d, 来源: %s",
      items.length,
      isRecord(value) && Array.isArray(value.moments) ? "object.moments" : Array.isArray(value) ? "array" : "unknown"
    );

    const recordItems = items.filter(isRecord);
    console.log("[Parse:Moments] isRecord 过滤后: %d 条", recordItems.length);

    const normalized = recordItems.map(normalizeKeyMoment);
    const results = normalized.filter((m): m is KeyMoment => m !== null);

    if (results.length < recordItems.length) {
      console.warn("[Parse:Moments] normalizeKeyMoment 过滤掉 %d 条不合格条目", recordItems.length - results.length);
      // 打印被过滤的条目信息
      recordItems.forEach((item, i) => {
        if (!normalized[i]) {
          console.warn("[Parse:Moments] 不合格条目 #%d:", i, {
            hasTitle: !!getString(item, ["title", "heading", "name"]),
            hasQuote: !!getString(item, ["quote", "text", "excerpt"]),
            hasReason: !!getString(item, ["reason", "explanation", "description", "note"]),
            hasTimestamp: !!getString(item, ["timestamp", "time", "range"]),
            hasStartEnd: !!(getNumber(item, ["startTime", "start", "start_time"]) && getNumber(item, ["endTime", "end", "end_time"])),
            keys: Object.keys(item)
          });
        }
      });
    }

    return results;
  } catch (err) {
    console.error("[Parse:Moments] 解析异常:", err instanceof Error ? err.message : err);
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
    if (!value) {
      console.warn("[Parse:Summary] parseJsonSafe 返回 null/undefined, 原始文本前200字: %s", raw.slice(0, 200));
      return [];
    }

    const items = isRecord(value) && Array.isArray(value.takeaways)
      ? value.takeaways
      : Array.isArray(value)
        ? value
        : [];

    console.log("[Parse:Summary] JSON 解析成功, items 数量: %d, 来源: %s",
      items.length,
      isRecord(value) && Array.isArray(value.takeaways) ? "object.takeaways" : Array.isArray(value) ? "array" : "unknown"
    );

    const recordItems = items.filter(isRecord);
    console.log("[Parse:Summary] isRecord 过滤后: %d 条", recordItems.length);

    const normalized = recordItems.map(normalizeTakeaway);
    const results = normalized.filter((t): t is SummaryTakeaway => t !== null);

    if (results.length < recordItems.length) {
      console.warn("[Parse:Summary] normalizeTakeaway 过滤掉 %d 条不合格条目", recordItems.length - results.length);
      recordItems.forEach((item, i) => {
        if (!normalized[i]) {
          const rawTs = item.timestamps;
          const hasValidTs = Array.isArray(rawTs)
            ? rawTs.some((t: unknown) => typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t))
            : typeof item.timestamp === "string" && /^\d{1,2}:\d{2}$/.test(item.timestamp);
          console.warn("[Parse:Summary] 不合格条目 #%d:", i, {
            hasLabel: !!getString(item, ["label", "title", "heading"]),
            hasInsight: !!getString(item, ["insight", "description", "detail", "body"]),
            hasTimestamps: hasValidTs,
            keys: Object.keys(item)
          });
        }
      });
    }

    return results;
  } catch (err) {
    console.error("[Parse:Summary] 解析异常:", err instanceof Error ? err.message : err);
    return [];
  }
}

function normalizeTakeaway(raw: Record<string, unknown>): SummaryTakeaway | null {
  const label = getString(raw, ["label", "title", "heading"]) ?? "";
  const insight = getString(raw, ["insight", "description", "detail", "body"]) ?? "";

  let timestamps: string[] = [];
  const rawTs = raw.timestamps;
  if (Array.isArray(rawTs)) {
    timestamps = rawTs
      .filter((t): t is string => typeof t === "string")
      .map(normalizeTimestampString)
      .filter((t): t is string => t !== null);
  } else if (typeof raw.timestamp === "string" && raw.timestamp.trim()) {
    const normalized = normalizeTimestampString(raw.timestamp);
    if (normalized) timestamps = [normalized];
  }

  // A takeaway remains valuable even when the model omits a timestamp. Keep
  // the text and render it without a seek link rather than dropping it all.
  if (!label || !insight) return null;

  const parsed = SummaryTakeawaySchema.safeParse({ label, insight, timestamps: timestamps.slice(0, 2) });
  return parsed.success ? parsed.data : null;
}

/** 将各种时间戳格式统一为 "M:SS" */
function normalizeTimestampString(ts: string): string | null {
  const trimmed = ts.trim();
  if (!trimmed) return null;

  // 已经是 M:SS 或 MM:SS 格式
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;

  // HH:MM:SS 格式 → 转为秒数再转回 M:SS
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
    return secondsToTimestamp(parseTimestampToSeconds(trimmed));
  }

  // 纯数字（秒数）→ 转为 M:SS
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return secondsToTimestamp(Number(trimmed));
  }

  return null;
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
  console.log("[Validate:Moments] 输入 %d 条, 字幕段数 %d", moments.length, transcript.length);

  // 1. 引文验证
  const withValidQuotes = moments.filter((m) => {
    const range = parseTimestampRange(m.timestamp);
    if (!range) {
      console.warn("[Validate:Moments] 时间戳解析失败, 丢弃: %s", m.timestamp);
      return false;
    }
    const valid = verifyQuoteInTranscript(m.quote, range[0], range[1], transcript);
    if (!valid) {
      console.warn("[Validate:Moments] 引文验证失败, 丢弃: title=%s, quote前50字=%s", m.title.slice(0, 30), m.quote.slice(0, 50));
    }
    return valid;
  });

  console.log("[Validate:Moments] 引文验证后: %d 条 (丢弃 %d)", withValidQuotes.length, moments.length - withValidQuotes.length);

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
      const existing = deduped[overlaps];
      if (m.quote.length > existing.quote.length) {
        console.log("[Validate:Moments] 时间段重叠, 替换: %s → %s", existing.title.slice(0, 30), m.title.slice(0, 30));
        deduped[overlaps] = m;
      }
    }
  }

  console.log("[Validate:Moments] 重叠去重后: %d 条 (丢弃 %d)", deduped.length, withValidQuotes.length - deduped.length);

  // 3. 相似引文去重
  const final: KeyMoment[] = [];
  for (const m of deduped) {
    const similar = final.findIndex((f) => {
      const n1 = normalizeText(m.quote);
      const n2 = normalizeText(f.quote);
      return ngramSimilarity(n1, n2, 3) > 0.85;
    });

    if (similar === -1) {
      final.push(m);
    } else {
      if (m.title.length > final[similar].title.length) {
        console.log("[Validate:Moments] 相似引文, 替换: %s → %s", final[similar].title.slice(0, 30), m.title.slice(0, 30));
        final[similar] = m;
      }
    }
  }

  console.log("[Validate:Moments] 相似去重后: %d 条 (丢弃 %d)", final.length, deduped.length - final.length);

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
  console.log("[Validate:Summary] 输入 %d 条, 字幕段数 %d", takeaways.length, transcript.length);

  const validated = takeaways
    .map((t) => {
      const filteredTs = t.timestamps.filter((ts) => {
        const seconds = parseTimestampToSeconds(ts);
        return transcript.some(
          (s) =>
            Math.abs(s.startTime - seconds) <= toleranceSeconds ||
            (seconds >= s.startTime && seconds <= s.endTime)
        );
      });

      if (filteredTs.length < t.timestamps.length) {
        console.warn("[Validate:Summary] 时间戳验证丢弃: label=%s, 原始ts=%s, 验证后ts=%s",
          t.label.slice(0, 30), t.timestamps, filteredTs);
      }

      return { ...t, timestamps: filteredTs };
    });

  console.log("[Validate:Summary] 验证后: %d 条 (丢弃 %d)", validated.length, takeaways.length - validated.length);

  return validated;
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
  // 尝试 1: 直接 JSON.parse
  try { return JSON.parse(raw); } catch { /* continue */ }

  // 尝试 2: 括号计数法提取
  const extracted = extractBalancedJson(raw);
  if (extracted) {
    try { return JSON.parse(extracted); } catch {
      // 尝试 3: 修复后解析
      const repaired = repairBrokenJson(extracted);
      if (repaired) {
        try { return JSON.parse(repaired); } catch { /* continue */ }
      }
    }
  }

  console.warn("[Parse:JSON] 所有解析方式均失败! extracted=%s, raw前200字=%s",
    extracted ? "有(但parse/repair失败)" : "无",
    raw.slice(0, 200)
  );
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
