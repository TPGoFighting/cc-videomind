# lib/ai/prompts.ts

## 文件路径

`lib/ai/prompts.ts`

## 功能摘要

构建基础 AI prompt 的模块，包含视频分析、摘要和聊天问答三种 prompt 模板，负责将字幕格式化并注入到 prompt 中。

## 关键实现细节

### 导出函数

- **`transcriptForPrompt(segments)`** — 将字幕格式化为 `[开始时间-结束时间] 文本` 格式，最大 60,000 字符。超过 220 段时采用头-中-尾采样策略（前 120 段 + 中间 80 段 + 尾部 50 段）。
- **`buildAnalysisPrompt(title, segments)`** — 构建视频分析 prompt，要求 AI 返回 JSON 格式的 `summary`、`takeaways`、`suggestedQuestions`、`highlights`。
- **`buildSummaryPrompt(title, segments)`** — 简单的英文摘要 prompt（未被主要使用）。
- **`buildChatPrompt(question, segments)`** — 构建聊天问答 prompt，要求 AI 返回带引用（`citations`）的 JSON 回答。

### 字幕采样策略

- `selectPromptSegments()` — 当字幕超过 220 段时，取头部 120 段、中间 80 段、尾部 50 段，保证覆盖视频全程。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `@/lib/types` | `TranscriptSegment` 类型 |
| `@/lib/utils/time` | `formatTimestamp` 时间格式化 |

### 被谁 import

- `lib/ai/provider.ts` — 导入 `buildAnalysisPrompt` 和 `buildChatPrompt` 用于 OpenAI 和 Gemini Provider 的分析/问答功能。

## 关联的功能模块

- `lib/ai/provider.ts` — 使用这些 prompt 构建 AI 请求。
- `lib/types` — 类型定义。
- `lib/utils/time` — 时间格式化工具。
