# lib/youtube/youtube-transcript-pkg-provider.ts

## 文件路径

`lib/youtube/youtube-transcript-pkg-provider.ts`

## 功能摘要

基于第三方 `youtube-transcript` npm 包的字幕提取 Provider，作为 InnerTube 和 HTML-first 策略的备选方案。

## 关键实现细节

### 类

- **`YoutubeTranscriptPackageProvider`** — 实现 `TranscriptProvider` 接口：
  - 使用动态 `import("youtube-transcript")` 避免本地构建时包不存在的问题。
  - 调用 `YoutubeTranscript.fetchTranscript(videoId, { lang })` 获取字幕。
  - 时间戳转换：`offset`（毫秒）→ `startTime`（秒），`offset + duration` → `endTime`。
  - 错误映射：`Transcript is disabled` → `NO_CAPTION_TRACKS`，`Video is unavailable` → `PAGE_FETCH_FAILED`。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `@/lib/types` | `TranscriptSegment` 类型 |
| `lib/youtube/transcript-provider` | `TranscriptError`、`TranscriptProvider` |

### 被谁 import

- 当前未被主流程直接使用，可作为备选 Provider 接入 fallback 链。

## 关联的功能模块

- `lib/youtube/transcript-provider.ts` — 主 Provider 实现和 fallback 编排。
