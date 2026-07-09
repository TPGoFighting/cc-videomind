# lib/youtube/transcript-provider.ts

## 文件路径

`lib/youtube/transcript-provider.ts`

## 功能摘要

YouTube 字幕提取的核心模块，包含三种 Provider 实现（InnerTube API、HTML-first、外部 API）、多格式字幕解析器（XML/VTT/JSON3）、句子合并器和多层 fallback 编排。

## 关键实现细节

### 接口

- **`TranscriptProvider`** — 字幕提取统一接口，`getTranscript(videoId, preferredLang?)` 返回 `TranscriptSegment[]`。
- **`RawSegment`** — 内部中间格式：`{ start, duration, text }`。
- **`CaptionTrack`** — 字幕轨道元数据：`{ baseUrl, languageCode, name, kind?, isTranslatable? }`。

### 错误体系

- **`TranscriptError`** — 带错误码的自定义 Error，包含 7 种错误码：`PAGE_FETCH_FAILED`、`CONSENT_REQUIRED`、`AGE_RESTRICTED`、`NO_PLAYER_RESPONSE`、`NO_CAPTION_TRACKS`、`CAPTION_DOWNLOAD_FAILED`、`ALL_TRACKS_FAILED`。

### Provider 实现

- **`InnertubeTranscriptProvider`** — 使用 InnerTube API（`/youtubei/v1/player`），支持 3 种客户端（ANDROID → WEB → IOS）自动回退。从 YouTube 首页提取 API key 并缓存。
- **`YouTubeTranscriptProvider`** — HTML-first 策略：获取 YouTube watch 页面 → 提取 `ytInitialPlayerResponse` → 解析字幕轨道。处理 EU 同意页面（CONSENT cookie）和年龄限制。内部复用了 `extractCaptionTracksPublic` 和 `rankTracksPublic` 供 InnerTube Provider 使用。
- **`ExternalApiTranscriptProvider`** — 调用 Supadata API 作为备选。
- **`FallbackTranscriptProvider`** — 多层回退编排：按顺序尝试多个 Provider，全部失败后抛出错误。

### 字幕解析

- **`parseCaptionContent(content)`** — 自动检测格式分发：XML（`<?xml`/`<transcript>`/`<p `）→ VTT（`WEBVTT`）→ JSON3（`{`）。
- **`parseXmlCaptions(xml)`** — 支持新版 `<p t="毫秒" d="毫秒">` 和旧版 `<text start="秒" dur="秒">` 两种格式。
- **`parseVttCaptions(vtt)`** — WebVTT 解析，支持 HH:MM:SS.mmm 和 MM:SS.mmm 时间戳，逗号/点号分隔毫秒。
- **`parseJson3Captions(json)`** — YouTube JSON3 格式：`{ events: [{ tStartMs, dDurationMs, segs: [{ utf8 }] }] }`。

### 句子合并器

- **`mergeIntoSentences(segments)`** — 三阶段处理：
  1. 按时间间隙（≤0.5s）和句子标点合并相邻片段。
  2. 在合并后的文本内部按标点边界切分。
  3. 安全网：对超长句子（>40词 / >24秒）强制拆分。
- 包含缩写（Dr./Mr. 等）、TLD（.com/.io 等）、小数的智能检测，避免误拆。

### 轨道排序

- `rankTracks()` 按优先级排序：指定语言手动 → 指定语言自动 → 英文手动 → 英文自动 → 其余手动 → 其余自动。同语言去重保留手动字幕。

### 工厂函数

- **`getTranscriptProvider()`** — 根据 `TRANSCRIPT_PROVIDER` 环境变量创建 Provider，默认返回 `InnertubeTranscriptProvider` + `ExternalApiTranscriptProvider` 的 fallback 链。

### 工具函数

- **`extractBalancedJson(text)`** — 大括号计数法从字符串中提取完整 JSON，正确处理字符串字面量、转义和嵌套。
- **`cleanCaptionText(raw)`** — 清理字幕文本：去 HTML 标签、解码实体、合并空白。
- **`decodeHtml(value)`** — HTML 实体解码（支持命名实体、数字实体、十六进制实体）。
- **`isRecord(value)`** — 类型守卫：判断是否为普通对象。
- **`get(obj, ...path)`** — 嵌套取值，支持字符串 key 和数字 index。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `@/lib/types` | `TranscriptSegment` 类型 |
| `@/lib/utils/http` | `fetchWithTimeout` 带超时的 HTTP 请求 |

### 被谁 import

- `lib/youtube/youtube-transcript-pkg-provider.ts` — 导入 `TranscriptError` 和 `TranscriptProvider`。
- `lib/bilibili/transcript-provider.ts` — 导入 `cleanCaptionText`、`isRecord`、`mergeIntoSentences`、`TranscriptProvider` 复用工具函数。
- `lib/youtube/transcript-provider.test.ts` — 测试文件。

## 关联的功能模块

- `lib/youtube/id.ts` — YouTube 视频 ID 提取。
- `lib/bilibili/transcript-provider.ts` — Bilibili 字幕提取（复用工具）。
- `lib/utils/http` — HTTP 请求工具。
