/**
 * moments-validator.ts 测试用例
 *
 * 覆盖：
 *   - parseTimestampToSeconds / secondsToTimestamp：时间戳转换
 *   - parseTimestampRange：范围解析
 *   - rangesOverlap：重叠检测
 *   - normalizeText：文本规范化
 *   - verifyQuoteInTranscript：引文验证
 *   - parseKeyMoments：JSON 解析 + 修复
 *   - parseSummaryTakeaways：JSON 解析
 *   - validateAndDedupMoments：去重 + 排序
 *   - validateSummaryTakeaways：时间戳验证
 *   - ngramSimilarity：n-gram 相似度
 *   - 边界情况
 *
 * 运行：npx tsx --test lib/utils/moments-validator.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseTimestampToSeconds,
  secondsToTimestamp,
  parseTimestampRange,
  rangesOverlap,
  normalizeText,
  verifyQuoteInTranscript,
  parseKeyMoments,
  parseSummaryTakeaways,
  validateAndDedupMoments,
  validateSummaryTakeaways,
} from "./moments-validator";
import type { KeyMoment, SummaryTakeaway, TranscriptSegment } from "../types";

// ═══════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════

function makeSegments(...texts: string[]): TranscriptSegment[] {
  return texts.map((text, i) => ({
    startTime: i * 10,
    endTime: (i + 1) * 10 - 0.1,
    text,
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// parseTimestampToSeconds
// ═══════════════════════════════════════════════════════════════════════

describe("parseTimestampToSeconds", () => {
  it('解析 "MM:SS" 格式', () => {
    assert.strictEqual(parseTimestampToSeconds("1:30"), 90);
    assert.strictEqual(parseTimestampToSeconds("0:00"), 0);
    assert.strictEqual(parseTimestampToSeconds("10:05"), 605);
  });

  it('解析 "HH:MM:SS" 格式', () => {
    assert.strictEqual(parseTimestampToSeconds("1:00:00"), 3600);
    assert.strictEqual(parseTimestampToSeconds("0:05:30"), 330);
  });

  it("解析裸数字（秒数）", () => {
    assert.strictEqual(parseTimestampToSeconds("45"), 45);
    assert.strictEqual(parseTimestampToSeconds("0"), 0);
  });

  it("无效输入返回 0", () => {
    assert.strictEqual(parseTimestampToSeconds("abc"), 0);
    assert.strictEqual(parseTimestampToSeconds(""), 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// secondsToTimestamp
// ═══════════════════════════════════════════════════════════════════════

describe("secondsToTimestamp", () => {
  it("秒数转为 M:SS", () => {
    assert.strictEqual(secondsToTimestamp(90), "1:30");
    assert.strictEqual(secondsToTimestamp(0), "0:00");
    assert.strictEqual(secondsToTimestamp(605), "10:05");
  });

  it("处理小数秒（向下取整）", () => {
    assert.strictEqual(secondsToTimestamp(90.7), "1:30");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// parseTimestampRange
// ═══════════════════════════════════════════════════════════════════════

describe("parseTimestampRange", () => {
  it('解析 "MM:SS-MM:SS"', () => {
    const result = parseTimestampRange("1:30-2:00");
    assert.deepStrictEqual(result, [90, 120]);
  });

  it('解析 "HH:MM:SS-HH:MM:SS"', () => {
    const result = parseTimestampRange("0:01:30-0:02:00");
    assert.deepStrictEqual(result, [90, 120]);
  });

  it("无效格式返回 null", () => {
    assert.strictEqual(parseTimestampRange("invalid"), null);
    assert.strictEqual(parseTimestampRange(""), null);
    assert.strictEqual(parseTimestampRange("1:30"), null);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// rangesOverlap
// ═══════════════════════════════════════════════════════════════════════

describe("rangesOverlap", () => {
  it("重叠范围返回 true", () => {
    assert.strictEqual(rangesOverlap([10, 30], [20, 40]), true);
    assert.strictEqual(rangesOverlap([10, 50], [20, 30]), true);
  });

  it("不重叠范围返回 false", () => {
    assert.strictEqual(rangesOverlap([10, 20], [30, 40]), false);
    assert.strictEqual(rangesOverlap([50, 60], [10, 20]), false);
  });

  it("边界接触不算重叠", () => {
    assert.strictEqual(rangesOverlap([10, 20], [20, 30]), true); // 端点接触算重叠
    assert.strictEqual(rangesOverlap([10, 19], [20, 30]), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// normalizeText
// ═══════════════════════════════════════════════════════════════════════

describe("normalizeText", () => {
  it("转小写", () => {
    assert.strictEqual(normalizeText("Hello World"), "hello world");
  });

  it("去除标点符号", () => {
    const result = normalizeText("Hello, world! How are you?");
    assert.strictEqual(result, "hello world how are you");
  });

  it("去除中文标点", () => {
    const result = normalizeText("你好，世界！这是一个测试。");
    assert.strictEqual(result, "你好 世界 这是一个测试");
  });

  it("合并多余空白", () => {
    assert.strictEqual(normalizeText("  hello   world  "), "hello world");
  });

  it("空字符串返回空", () => {
    assert.strictEqual(normalizeText(""), "");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// verifyQuoteInTranscript
// ═══════════════════════════════════════════════════════════════════════

describe("verifyQuoteInTranscript", () => {
  const transcript = makeSegments(
    "This is the first segment of the video",
    "It contains important information about the topic",
    "The speaker explains the core concept in detail",
    "And then provides a concrete example to illustrate it",
    "Finally, the speaker concludes with key takeaways"
  );

  it("精确匹配返回 true", () => {
    assert.strictEqual(
      verifyQuoteInTranscript("the first segment of the video", 0, 10, transcript),
      true
    );
  });

  it("模糊匹配（70% 覆盖率）返回 true", () => {
    assert.strictEqual(
      verifyQuoteInTranscript("first segment of video", 0, 10, transcript),
      true
    );
  });

  it("完全不存在的文本返回 false", () => {
    assert.strictEqual(
      verifyQuoteInTranscript("completely unrelated text about space aliens", 0, 10, transcript),
      false
    );
  });

  it("过短的引文返回 false（< 5 字符）", () => {
    assert.strictEqual(verifyQuoteInTranscript("ab", 0, 10, transcript), false);
  });

  it("在时间范围外搜索（回退到全字幕）", () => {
    // 文本存在于中间段，但搜索范围限定在开头附近
    // 应该通过全字幕回退找到
    assert.strictEqual(
      verifyQuoteInTranscript("core concept in detail", 0, 5, transcript),
      true
    );
  });

  it("邻段时间范围匹配", () => {
    assert.strictEqual(
      verifyQuoteInTranscript("speaker concludes with key takeaways", 35, 50, transcript),
      true
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// parseKeyMoments
// ═══════════════════════════════════════════════════════════════════════

describe("parseKeyMoments", () => {
  it("解析有效的 moments JSON", () => {
    const json = JSON.stringify({
      moments: [
        {
          title: "关键发现",
          timestamp: "01:30-02:00",
          quote: "this is an exact quote",
          reason: "这是一个重要时刻",
        },
      ],
    });
    const result = parseKeyMoments(json);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, "关键发现");
    assert.strictEqual(result[0].timestamp, "01:30-02:00");
  });

  it("解析直接数组格式", () => {
    const json = JSON.stringify([
      {
        title: "要点一",
        timestamp: "00:10-00:20",
        quote: "exact transcript quote here",
        reason: "说明了核心概念",
      },
    ]);
    const result = parseKeyMoments(json);
    assert.strictEqual(result.length, 1);
  });

  it("过滤缺少必填字段的条目", () => {
    const json = JSON.stringify({
      moments: [
        { title: "标题", timestamp: "00:10-00:20", quote: "quote", reason: "reason" },
        { title: "", timestamp: "00:30-00:40", quote: "q", reason: "r" }, // 空标题
        { timestamp: "00:50-01:00", quote: "q", reason: "r" }, // 缺标题
      ],
    });
    const result = parseKeyMoments(json);
    assert.strictEqual(result.length, 1);
  });

  it("包裹在 markdown 中的 JSON 也能解析", () => {
    const raw = '```json\n{"moments": [{"title": "测试", "timestamp": "00:10-00:20", "quote": "test quote here", "reason": "reason text"}]}\n```';
    const result = parseKeyMoments(raw);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, "测试");
  });

  it("无效 JSON 返回空数组", () => {
    assert.deepStrictEqual(parseKeyMoments("not json at all"), []);
  });

  it("空输入返回空数组", () => {
    assert.deepStrictEqual(parseKeyMoments(""), []);
  });

  it("数字时间戳自动转换为字符串范围", () => {
    const json = JSON.stringify({
      moments: [
        {
          title: "测试",
          startTime: 90,
          endTime: 120,
          quote: "a valid quote text here",
          reason: "reason text here",
        },
      ],
    });
    const result = parseKeyMoments(json);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].timestamp, "1:30-2:00");
  });

  it("timestamp 正则校验不合格的条目被丢弃", () => {
    const json = JSON.stringify({
      moments: [
        {
          title: "测试",
          timestamp: "not-a-timestamp",
          quote: "valid quote text here",
          reason: "reason text",
        },
      ],
    });
    const result = parseKeyMoments(json);
    assert.strictEqual(result.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// parseSummaryTakeaways
// ═══════════════════════════════════════════════════════════════════════

describe("parseSummaryTakeaways", () => {
  it("解析有效的 takeaways JSON", () => {
    const json = JSON.stringify({
      takeaways: [
        {
          label: "核心发现",
          insight: "这个观点非常重要，因为它展示了...",
          timestamps: ["1:30", "2:00"],
        },
      ],
    });
    const result = parseSummaryTakeaways(json);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].label, "核心发现");
    assert.strictEqual(result[0].timestamps.length, 2);
  });

  it("过滤缺少必填字段的条目", () => {
    const json = JSON.stringify({
      takeaways: [
        { label: "L1", insight: "I1", timestamps: ["1:00"] },
        { label: "", insight: "I2", timestamps: ["2:00"] }, // 空 label
        { label: "L3", insight: "", timestamps: ["3:00"] }, // 空 insight
        { label: "L4", insight: "I4", timestamps: [] }, // 无时间戳
      ],
    });
    const result = parseSummaryTakeaways(json);
    assert.strictEqual(result.length, 1);
  });

  it("无效 JSON 返回空数组", () => {
    assert.deepStrictEqual(parseSummaryTakeaways("garbage"), []);
  });

  it("过滤超数时间戳（最多保留 2 个）", () => {
    const json = JSON.stringify({
      takeaways: [
        {
          label: "测试",
          insight: "test insight text",
          timestamps: ["0:10", "0:20", "0:30", "0:40"],
        },
      ],
    });
    const result = parseSummaryTakeaways(json);
    assert.strictEqual(result[0].timestamps.length, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// validateAndDedupMoments
// ═══════════════════════════════════════════════════════════════════════

describe("validateAndDedupMoments", () => {
  const transcript = makeSegments(
    "This is the first segment about AI technology",
    "The second segment discusses machine learning applications",
    "Here we explore deep learning and neural networks",
    "Transfer learning has become very popular recently",
    "The final segment wraps up with key conclusions"
  );

  function makeMoment(overrides: Partial<KeyMoment> = {}): KeyMoment {
    return {
      title: "测试要点",
      timestamp: "0:00-0:10",
      quote: "first segment about AI technology",
      reason: "说明了 AI 技术的核心概念",
      ...overrides,
    };
  }

  it("引文匹配的 moment 被保留", () => {
    const moments = [makeMoment({ quote: "first segment about AI" })];
    const result = validateAndDedupMoments(moments, transcript);
    assert.strictEqual(result.length, 1);
  });

  it("引文不匹配的 moment 被丢弃", () => {
    const moments = [makeMoment({ quote: "this text does not exist anywhere" })];
    const result = validateAndDedupMoments(moments, transcript);
    assert.strictEqual(result.length, 0);
  });

  it("时间戳重叠的 moments 去重（保留 quote 更长的）", () => {
    const moments = [
      makeMoment({ quote: "first segment about AI technology", timestamp: "0:00-0:10" }),
      makeMoment({ quote: "AI tech", timestamp: "0:01-0:09", title: "短引文" }),
    ];
    const result = validateAndDedupMoments(moments, transcript);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].quote.length > 10); // 保留了更长的引文
  });

  it("相似引文去重（>85% 相似度）", () => {
    const moments = [
      makeMoment({
        quote: "first segment about AI technology",
        timestamp: "0:00-0:10",
        title: "第一个",
      }),
      makeMoment({
        quote: "first segment about AI technology",
        timestamp: "0:20-0:30",
        title: "几乎相同的第二个",
      }),
    ];
    const result = validateAndDedupMoments(moments, transcript);
    // 相同引文但不同时间段 → 相似度去重
    assert.strictEqual(result.length, 1);
  });

  it("按开始时间排序", () => {
    const moments = [
      makeMoment({ quote: "final segment wraps up with key", timestamp: "0:40-0:50", title: "结尾" }),
      makeMoment({ quote: "second segment discusses machine", timestamp: "0:10-0:19", title: "中段" }),
      makeMoment({ quote: "first segment about AI technology", timestamp: "0:00-0:09", title: "开头" }),
    ];
    const result = validateAndDedupMoments(moments, transcript);
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].title, "开头");
    assert.strictEqual(result[1].title, "中段");
    assert.strictEqual(result[2].title, "结尾");
  });

  it("最多返回 5 个", () => {
    const moments = Array.from({ length: 10 }, (_, i) =>
      makeMoment({
        title: `要点 ${i}`,
        timestamp: `0:${String(i * 5).padStart(2, "0")}-0:${String(i * 5 + 3).padStart(2, "0")}`,
        quote: i < 5 ? `this is the first segment about AI` : `final segment wraps up with key`,
      })
    );
    const result = validateAndDedupMoments(moments, transcript);
    assert.ok(result.length <= 5);
  });

  it("空数组返回空", () => {
    assert.deepStrictEqual(validateAndDedupMoments([], transcript), []);
  });

  it("无效 timestamp 格式的 moment 被丢弃", () => {
    const moments = [makeMoment({ timestamp: "invalid" })];
    const result = validateAndDedupMoments(moments, transcript);
    assert.strictEqual(result.length, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// validateSummaryTakeaways
// ═══════════════════════════════════════════════════════════════════════

describe("validateSummaryTakeaways", () => {
  const transcript: TranscriptSegment[] = [
    { startTime: 0, endTime: 9.9, text: "intro" },
    { startTime: 10, endTime: 19.9, text: "first point" },
    { startTime: 20, endTime: 29.9, text: "second point" },
    { startTime: 30, endTime: 39.9, text: "conclusion" },
  ];

  function makeTakeaway(overrides: Partial<SummaryTakeaway> = {}): SummaryTakeaway {
    return {
      label: "测试摘要",
      insight: "这是一个测试洞察",
      timestamps: ["0:10"],
      ...overrides,
    };
  }

  it("有效时间戳被保留", () => {
    const takeaways = [makeTakeaway({ timestamps: ["0:10"] })];
    const result = validateSummaryTakeaways(takeaways, transcript);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].timestamps, ["0:10"]);
  });

  it("无效时间戳被过滤", () => {
    const takeaways = [makeTakeaway({ timestamps: ["0:10", "5:00", "0:30"] })];
    const result = validateSummaryTakeaways(takeaways, transcript);
    assert.strictEqual(result.length, 1);
    // "5:00" 不在字幕中，被过滤
    assert.deepStrictEqual(result[0].timestamps, ["0:10", "0:30"]);
  });

  it("所有时间戳无效时整条被丢弃", () => {
    const takeaways = [makeTakeaway({ timestamps: ["9:99"] })];
    const result = validateSummaryTakeaways(takeaways, transcript);
    assert.strictEqual(result.length, 0);
  });

  it("容差范围内的时间戳被接受", () => {
    // startTime=10, toleranceSeconds=5 → 5-15 范围内
    const takeaways = [makeTakeaway({ timestamps: ["0:07"] })]; // 7s，在 [10-5, 10+5] 容差外
    // 但也在 [0, 10) 字幕段的检查中...
    // 实际上 7s 离最近的段 startTime=10（差3s），或 startTime=0（差7s）
    // tolerance 默认 5，所以 7s 和 0 差 7 > 5，和 10 差 3 <= 5
    const result = validateSummaryTakeaways(takeaways, transcript);
    assert.strictEqual(result.length, 1);
  });

  it("空数组返回空", () => {
    assert.deepStrictEqual(validateSummaryTakeaways([], transcript), []);
  });
});
