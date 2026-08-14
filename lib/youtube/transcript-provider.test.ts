/**
 * transcript-provider.ts 测试用例
 *
 * 覆盖：
 *   - extractBalancedJson：正常/嵌套/字符串花括号/转义/无匹配
 *   - parseCaptionContent：XML新格式/旧格式/VTT/JSON3/空内容/未知格式
 *   - cleanCaptionText / decodeHtml：HTML实体/标签/空白
 *   - get / isRecord：嵌套取值/数组索引/边界情况
 *   - rankTracks（通过实例化 YouTubeTranscriptProvider 间接测试）
 *   - 错误码类型守卫
 *
 * 运行：npx tsx --test lib/youtube/transcript-provider.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractBalancedJson,
  parseCaptionContent,
  cleanCaptionText,
  decodeHtml,
  isRecord,
  get,
  TranscriptError,
  YouTubeTranscriptProvider
} from "./transcript-provider";
import type { CaptionTrack, TranscriptErrorCode } from "./transcript-provider";

// ═══════════════════════════════════════════════════════════════════
// extractBalancedJson
// ═══════════════════════════════════════════════════════════════════

describe("extractBalancedJson", () => {
  it("提取简单的单层 JSON 对象", () => {
    const result = extractBalancedJson('{"a": 1, "b": 2}');
    assert.ok(result);
    assert.deepStrictEqual(JSON.parse(result!), { a: 1, b: 2 });
  });

  it("提取嵌套 JSON 对象", () => {
    const result = extractBalancedJson(
      '{"outer": {"inner": [1, 2, 3]}, "x": "y"}'
    );
    assert.ok(result);
    assert.deepStrictEqual(JSON.parse(result!), {
      outer: { inner: [1, 2, 3] },
      x: "y"
    });
  });

  it("忽略字符串中的花括号", () => {
    const result = extractBalancedJson(
      '{"text": "hello {world}!", "data": {"key": "val}}"}}'
    );
    assert.ok(result);
    const parsed = JSON.parse(result!) as Record<string, unknown>;
    assert.strictEqual(parsed.text, "hello {world}!");
  });

  it("忽略转义引号", () => {
    const result = extractBalancedJson(
      '{"message": "He said \\"hello\\"", "count": 1}'
    );
    assert.ok(result);
    const parsed = JSON.parse(result!) as Record<string, unknown>;
    assert.strictEqual(parsed.message, 'He said "hello"');
    assert.strictEqual(parsed.count, 1);
  });

  it("忽略单引号字符串中的花括号", () => {
    const result = extractBalancedJson(
      "{'key': 'val{inside}'}xxx"
    );
    // 单引号在 JSON 中不合法，但提取器会当作字符串跳过
    assert.ok(result);
  });

  it("处理前面有其他文本的 JSON", () => {
    const result = extractBalancedJson(
      'var ytInitialPlayerResponse = {"status": "ok"};'
    );
    assert.ok(result);
    assert.deepStrictEqual(JSON.parse(result!), { status: "ok" });
  });

  it("处理跨行 JSON", () => {
    const result = extractBalancedJson('{\n  "a": 1,\n  "b": 2\n}');
    assert.ok(result);
    assert.deepStrictEqual(JSON.parse(result!), { a: 1, b: 2 });
  });

  it("输入无花括号返回 null", () => {
    assert.strictEqual(extractBalancedJson("hello world"), null);
  });

  it("花括号无法闭合返回 null", () => {
    assert.strictEqual(extractBalancedJson('{"a": 1, "b": 2'), null);
  });

  it("输入空字符串返回 null", () => {
    assert.strictEqual(extractBalancedJson(""), null);
  });

  it("处理转义的反斜杠", () => {
    const result = extractBalancedJson('{"path": "C:\\\\Users\\\\test"}');
    assert.ok(result);
    const parsed = JSON.parse(result!) as Record<string, unknown>;
    assert.strictEqual(parsed.path, "C:\\Users\\test");
  });

  it("处理数组中的花括号", () => {
    const result = extractBalancedJson(
      '{"items": [{"id": 1}, {"id": 2}]}'
    );
    assert.ok(result);
    const parsed = JSON.parse(result!) as Record<string, unknown>;
    assert.ok(Array.isArray(parsed.items));
    assert.strictEqual((parsed.items as Array<Record<string, unknown>>).length, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// parseCaptionContent — XML 格式
// ═══════════════════════════════════════════════════════════════════

describe("parseCaptionContent — XML", () => {
  it("解析新版 XML 字幕（毫秒时间戳）", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text>
    <p t="1230" d="4560">Hello world</p>
    <p t="5800" d="3200">Second line here</p>
  </text>
</transcript>`;

    const result = parseCaptionContent(xml);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].start, 1.23);
    assert.strictEqual(result[0].duration, 4.56);
    assert.strictEqual(result[0].text, "Hello world");
    assert.strictEqual(result[1].start, 5.8);
    assert.strictEqual(result[1].duration, 3.2);
    assert.strictEqual(result[1].text, "Second line here");
  });

  it("解析旧版 XML 字幕（秒级时间戳）", () => {
    const xml = `<transcript>
  <text start="1.23" dur="4.56">Hello world</text>
  <text start="5.8" dur="3.2">Second line</text>
</transcript>`;

    const result = parseCaptionContent(xml);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].start, 1.23);
    assert.strictEqual(result[0].duration, 4.56);
    assert.strictEqual(result[1].start, 5.8);
    assert.strictEqual(result[1].duration, 3.2);
  });

  it("过滤掉只有标签没有文本的片段", () => {
    const xml = `<transcript>
  <p t="0" d="5000"><font color="#ffffff"></font></p>
  <p t="5000" d="3000">actual text</p>
</transcript>`;

    const result = parseCaptionContent(xml);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, "actual text");
  });

  it("处理 XML 中包含 HTML 实体", () => {
    const xml = `<transcript>
  <p t="0" d="5000">He said &quot;hello&quot; &amp; goodbye</p>
</transcript>`;

    const result = parseCaptionContent(xml);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, 'He said "hello" & goodbye');
  });

  it("空 XML 返回空数组", () => {
    assert.deepStrictEqual(parseCaptionContent("<?xml version=\"1.0\"?><transcript></transcript>"), []);
  });

  it("处理缺少 d 属性的 p 标签", () => {
    const xml = `<transcript>
  <p t="0">First</p>
  <p t="3000">Second</p>
  <p t="7000">Third</p>
</transcript>`;

    const result = parseCaptionContent(xml);
    // 缺少 d 属性时从前一个片段的 start 推算 duration
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0].start, 0);
    assert.strictEqual(result[0].text, "First");
    assert.strictEqual(result[1].start, 3);
    assert.strictEqual(result[1].text, "Second");
  });
});

// ═══════════════════════════════════════════════════════════════════
// parseCaptionContent — VTT 格式
// ═══════════════════════════════════════════════════════════════════

describe("parseCaptionContent — VTT", () => {
  it("解析标准 WebVTT 字幕", () => {
    const vtt = `WEBVTT

00:00:01.230 --> 00:00:05.670
Hello world, this is a test.

00:00:06.000 --> 00:00:10.500
Second line of subtitles.`;

    const result = parseCaptionContent(vtt);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].start, 1.23);
    assert.ok(Math.abs(result[0].duration - 4.44) < 0.001);
    assert.strictEqual(result[0].text, "Hello world, this is a test.");
    assert.strictEqual(result[1].start, 6);
    assert.strictEqual(result[1].duration, 4.5);
  });

  it("解析带 VTT 标签的字幕（过滤掉 <c> <v> 等标签）", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:05.000
<c.magenta>Speaker A:</c.magenta> Welcome everyone.

00:00:06.000 --> 00:00:10.000
<v Speaker B>Thank you for having me.</v>`;

    const result = parseCaptionContent(vtt);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].text, "Speaker A: Welcome everyone.");
    assert.strictEqual(result[1].text, "Thank you for having me.");
  });

  it("解析短时间戳格式（MM:SS）", () => {
    const vtt = `WEBVTT

01:23.500 --> 01:28.200
Short format timestamp.`;

    const result = parseCaptionContent(vtt);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].start, 83.5);
    assert.ok(Math.abs(result[0].duration - 4.7) < 0.001);
  });

  it("解析逗号分隔毫秒的 VTT", () => {
    const vtt = `WEBVTT

00:00:01,230 --> 00:00:05,670
Comma format.`;

    const result = parseCaptionContent(vtt);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].start, 1.23);
  });

  it("空 VTT 返回空数组", () => {
    assert.deepStrictEqual(parseCaptionContent("WEBVTT\n\n"), []);
  });

  it("处理跨行 VTT 文本", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:05.000
Line one.
Line two.
Line three.`;

    const result = parseCaptionContent(vtt);
    assert.strictEqual(result.length, 1);
    const expected = "Line one. Line two. Line three.";
    assert.strictEqual(result[0].text, expected);
  });
});

// ═══════════════════════════════════════════════════════════════════
// parseCaptionContent — JSON3 格式
// ═══════════════════════════════════════════════════════════════════

describe("parseCaptionContent — JSON3", () => {
  it("解析 YouTube JSON3 字幕格式", () => {
    const json3 = JSON.stringify({
      events: [
        { tStartMs: 1230, dDurationMs: 4560, segs: [{ utf8: "Hello world" }] },
        { tStartMs: 5800, dDurationMs: 3200, segs: [{ utf8: "Second" }, { utf8: " line" }] }
      ]
    });

    const result = parseCaptionContent(json3);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].start, 1.23);
    assert.strictEqual(result[0].duration, 4.56);
    assert.strictEqual(result[0].text, "Hello world");
    assert.strictEqual(result[1].start, 5.8);
    assert.strictEqual(result[1].duration, 3.2);
    assert.strictEqual(result[1].text, "Second line");
  });

  it("JSON3 无 events 返回空数组", () => {
    assert.deepStrictEqual(parseCaptionContent('{"other": "data"}'), []);
  });

  it("无效 JSON 返回空数组（然后回退到其他解析器）", () => {
    // 以 { 开头但格式错误的 JSON — JSON3 解析器吞下错误，返回空
    const result = parseCaptionContent('{invalid json content} extra');
    assert.deepStrictEqual(result, []);
  });
});

// ═══════════════════════════════════════════════════════════════════
// cleanCaptionText / decodeHtml
// ═══════════════════════════════════════════════════════════════════

describe("cleanCaptionText", () => {
  it("去除 HTML 标签", () => {
    assert.strictEqual(
      cleanCaptionText('<font color="#fff">Hello</font> <b>world</b>'),
      "Hello world"
    );
  });

  it("解码 HTML 实体", () => {
    assert.strictEqual(
      cleanCaptionText("It&quot;s &amp; it&apos;s &lt;cool&gt;"),
      "It\"s & it's <cool>"
    );
  });

  it("解码数字实体", () => {
    assert.strictEqual(cleanCaptionText("&#65;&#66;&#67;"), "ABC");
  });

  it("解码十六进制实体", () => {
    assert.strictEqual(cleanCaptionText("&#x41;&#x42;&#x43;"), "ABC");
  });

  it("处理 &nbsp;", () => {
    assert.strictEqual(cleanCaptionText("hello&nbsp;world"), "hello world");
  });

  it("合并多余空白", () => {
    assert.strictEqual(
      cleanCaptionText("  hello   world  "),
      "hello world"
    );
  });

  it("处理多行文本为单行", () => {
    assert.strictEqual(
      cleanCaptionText("line1\nline2\n\nline3"),
      "line1 line2 line3"
    );
  });

  it("空字符串返回空", () => {
    assert.strictEqual(cleanCaptionText(""), "");
  });
});

describe("decodeHtml", () => {
  it("解码全部六种命名实体", () => {
    assert.strictEqual(decodeHtml("&amp;"), "&");
    assert.strictEqual(decodeHtml("&lt;"), "<");
    assert.strictEqual(decodeHtml("&gt;"), ">");
    assert.strictEqual(decodeHtml("&quot;"), '"');
    assert.strictEqual(decodeHtml("&#39;"), "'");
    assert.strictEqual(decodeHtml("&apos;"), "'");
  });

  it("无实体时原样返回", () => {
    assert.strictEqual(decodeHtml("plain text"), "plain text");
  });
});

// ═══════════════════════════════════════════════════════════════════
// get / isRecord
// ═══════════════════════════════════════════════════════════════════

describe("get", () => {
  it("正常取值", () => {
    assert.strictEqual(get({ a: 1 }, "a"), 1);
  });

  it("嵌套取值", () => {
    assert.strictEqual(get({ a: { b: { c: 42 } } }, "a", "b", "c"), 42);
  });

  it("数组索引取值", () => {
    assert.strictEqual(get({ items: [{ name: "first" }, { name: "second" }] }, "items", 1, "name"), "second");
  });

  it("缺失 key 返回 undefined", () => {
    assert.strictEqual(get({ a: 1 }, "b"), undefined);
  });

  it("中间路径为非对象时返回 undefined", () => {
    assert.strictEqual(get({ a: 1 }, "a", "b"), undefined);
  });

  it("数组索引超出范围返回 undefined", () => {
    const data = { arr: [1, 2, 3] };
    assert.strictEqual(get(data, "arr", 10), undefined);
  });

  it("非数组使用数字索引返回 undefined", () => {
    assert.strictEqual(get({ a: 1 }, 0), undefined);
  });
});

describe("isRecord", () => {
  it("普通对象返回 true", () => {
    assert.strictEqual(isRecord({}), true);
    assert.strictEqual(isRecord({ a: 1 }), true);
  });

  it("数组返回 false", () => {
    assert.strictEqual(isRecord([]), false);
    assert.strictEqual(isRecord([1, 2, 3]), false);
  });

  it("null 返回 false", () => {
    assert.strictEqual(isRecord(null), false);
  });

  it("原始类型返回 false", () => {
    assert.strictEqual(isRecord("string"), false);
    assert.strictEqual(isRecord(42), false);
    assert.strictEqual(isRecord(true), false);
    assert.strictEqual(isRecord(undefined), false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// TranscriptError
// ═══════════════════════════════════════════════════════════════════

describe("TranscriptError", () => {
  it("创建带错误码的实例", () => {
    const err = new TranscriptError("NO_CAPTION_TRACKS", "无字幕");
    assert.ok(err instanceof Error);
    assert.strictEqual(err.name, "TranscriptError");
    assert.strictEqual(err.code, "NO_CAPTION_TRACKS");
    assert.strictEqual(err.message, "无字幕");
  });

  const validCodes: TranscriptErrorCode[] = [
    "PAGE_FETCH_FAILED",
    "CONSENT_REQUIRED",
    "AGE_RESTRICTED",
    "NO_PLAYER_RESPONSE",
    "NO_CAPTION_TRACKS",
    "CAPTION_DOWNLOAD_FAILED",
    "ALL_TRACKS_FAILED"
  ];

  for (const code of validCodes) {
    it(`错误码 "${code}" 可正常创建`, () => {
      const err = new TranscriptError(code, "test");
      assert.strictEqual(err.code, code);
      assert.ok(err.message.length > 0);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// YouTubeTranscriptProvider — rankTracks (间接测试)
// ═══════════════════════════════════════════════════════════════════

describe("YouTubeTranscriptProvider", () => {
  it("可以实例化", () => {
    const provider = new YouTubeTranscriptProvider();
    assert.ok(provider instanceof YouTubeTranscriptProvider);
  });
});

// 以下测试通过反射访问私有方法 rankTracks 验证轨道排序逻辑
// 使用 (provider as any) 绕过 TypeScript 的私有访问限制
describe("轨道排序逻辑 (反射测试)", () => {
  /** 辅助：创建测试用 CaptionTrack */
  function makeTrack(
    languageCode: string,
    name: string,
    kind?: "asr"
  ): CaptionTrack {
    return { baseUrl: `https://example.com/${languageCode}`, languageCode, name, kind };
  }

  it("去重 — 同语言保留手动字幕优先", () => {
    const provider = new YouTubeTranscriptProvider() as unknown as {
      rankTracks(tracks: CaptionTrack[], lang?: string): CaptionTrack[];
    };
    const tracks = [
      makeTrack("en", "English (auto)", "asr"),
      makeTrack("en", "English (manual)")
    ];

    const result = provider.rankTracks(tracks);
    // 手动英文字幕应该在前面，去重后只有一个 en
    const enTracks = result.filter((t) => t.languageCode === "en");
    assert.strictEqual(enTracks.length, 1);
    assert.strictEqual(enTracks[0].kind, undefined); // 保留手动
  });

  it("首选指定语言", () => {
    const provider = new YouTubeTranscriptProvider() as unknown as {
      rankTracks(tracks: CaptionTrack[], lang?: string): CaptionTrack[];
    };
    const tracks = [
      makeTrack("ja", "Japanese (auto)", "asr"),
      makeTrack("en", "English (auto)", "asr"),
      makeTrack("zh", "Chinese (manual)"),
      makeTrack("en", "English (manual)")
    ];

    const result = provider.rankTracks(tracks, "zh");
    // 第一个应该是中文手动字幕
    assert.strictEqual(result[0].languageCode, "zh");
  });

  it("英语作为默认首选（未指定语言时）", () => {
    const provider = new YouTubeTranscriptProvider() as unknown as {
      rankTracks(tracks: CaptionTrack[], lang?: string): CaptionTrack[];
    };
    const tracks = [
      makeTrack("ja", "Japanese (auto)", "asr"),
      makeTrack("en", "English (auto)", "asr"),
      makeTrack("fr", "French (manual)"),
      makeTrack("en", "English (manual)")
    ];

    const result = provider.rankTracks(tracks);
    // 调试：输出实际排序
    const order = result.map((t) => `${t.languageCode}:${t.kind ?? "manual"}`);
    // 手动英文应该在前两位（去重后只有 en:manual）
    const enIdx = result.findIndex((t) => t.languageCode === "en" && t.kind === undefined);
    const frIdx = result.findIndex((t) => t.languageCode === "fr");
    assert.ok(enIdx >= 0, `英文手动字幕应该在结果中，实际排序：${order.join(", ")}`);
    assert.ok(
      enIdx < frIdx,
      `英文手动字幕应该在法文前，实际排序：${order.join(", ")}`
    );
  });

  it("只有自动字幕时使用自动字幕", () => {
    const provider = new YouTubeTranscriptProvider() as unknown as {
      rankTracks(tracks: CaptionTrack[], lang?: string): CaptionTrack[];
    };
    const tracks = [
      makeTrack("es", "Spanish (auto)", "asr"),
      makeTrack("en", "English (auto)", "asr"),
      makeTrack("de", "German (auto)", "asr")
    ];

    const result = provider.rankTracks(tracks);
    // 英文自动字幕第一位
    assert.strictEqual(result[0].languageCode, "en");
    assert.strictEqual(result[0].kind, "asr");
  });

  it("空轨道列表返回空数组", () => {
    const provider = new YouTubeTranscriptProvider() as unknown as {
      rankTracks(tracks: CaptionTrack[], lang?: string): CaptionTrack[];
    };
    assert.deepStrictEqual(provider.rankTracks([]), []);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 集成测试 — parseCaptionContent 格式自动检测
// ═══════════════════════════════════════════════════════════════════

describe("parseCaptionContent — 格式自动检测", () => {
  it("以 <?xml 开头自动使用 XML 解析器", () => {
    const content = `<?xml version="1.0"?><transcript><p t="0" d="5000">test</p></transcript>`;
    const result = parseCaptionContent(content);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, "test");
  });

  it("以 WEBVTT 开头自动使用 VTT 解析器", () => {
    const content = `WEBVTT\n\n00:00:01.000 --> 00:00:05.000\ntest`;
    const result = parseCaptionContent(content);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, "test");
  });

  it("以 { 开头且有效 JSON 使用 JSON3 解析器", () => {
    const content = JSON.stringify({
      events: [{ tStartMs: 1000, dDurationMs: 4000, segs: [{ utf8: "hello" }] }]
    });
    const result = parseCaptionContent(content);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].text, "hello");
  });

  it("空字符串返回空数组", () => {
    assert.deepStrictEqual(parseCaptionContent(""), []);
  });

  it("完全未知格式返回空数组（不抛异常）", () => {
    const result = parseCaptionContent("this is not any known subtitle format");
    assert.deepStrictEqual(result, []);
  });
});
