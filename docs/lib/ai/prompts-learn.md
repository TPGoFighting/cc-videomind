# lib/ai/prompts-learn.ts

## 文件路径

`lib/ai/prompts-learn.ts`

## 功能摘要

构建学习辅助相关 prompt 的模块，包含词义定义生成、转录文本翻译（索引格式）以及双语 KeyMoment/Summary prompt。

## 关键实现细节

### 导出函数

- **`buildWordDefinitionsPrompt(lemmas)`** — 批量生成词义定义 prompt，输入词形列表（最多 30 个），输出包含 lemma、phonetic（IPA）、partOfSpeech、definitionZh、definitionEn、exampleEn、exampleZh 的 JSON。
- **`buildTranscriptTranslationPrompt(segments, targetLanguage, videoTitle?)`** — 转录翻译 prompt，使用 `[INPUT_N]...[/INPUT_N]` / `[OUTPUT_N]...[/OUTPUT_N]` 索引格式，避免 JSON 解析失败导致整批丢失。支持可选的视频标题上下文。
- **`parseIndexedTranslation(response, expectedCount)`** — 解析索引格式的翻译响应，返回 `Map<索引, 翻译文本>`，正则 `\[OUTPUT_(\d+)\]([\s\S]*?)\[\/OUTPUT_\1\]`。
- **`buildBilingualMomentsPrompt(title, segments, theme?)`** — 双语 KeyMoment prompt，title/quote/reason 为英文，_zh 字段为中文翻译。
- **`buildBilingualSummaryPrompt(title, segments)`** — 双语 Summary prompt，label/insight 为英文，_zh 字段为中文翻译。

### 内部工具

- **`xmlEscape(text)`** — XML 转义。
- **`formatTranscriptForPrompt(segments, maxChars)`** — 格式化字幕（30K 字符上限）。
- **`selectSegments(segments)`** — 段选择策略（与 prompts-v2 相同）。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `@/lib/types` | `TranscriptSegment` 类型 |
| `@/lib/utils/time` | `formatTimestamp` |

### 被谁 import

- `lib/ai/provider.ts` — 导入 `buildWordDefinitionsPrompt`、`buildTranscriptTranslationPrompt`、`parseIndexedTranslation` 用于词义定义和翻译功能。

## 关联的功能模块

- `lib/ai/provider.ts` — 使用这些 prompt 和解析函数执行 AI 任务。
- `lib/ai/prompts.ts` — 基础版 prompt。
- `lib/ai/prompts-v2.ts` — 进阶版 prompt。
