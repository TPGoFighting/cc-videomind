# lib/ai/prompts-v2.ts

## 文件路径

`lib/ai/prompts-v2.ts`

## 功能摘要

构建进阶版 prompt 的模块，支持关键片段提取（Smart/Fast 两种模式）和结构化摘要生成，输出中英双语内容。

## 关键实现细节

### 导出函数

- **`buildKeyMomentsPrompt(title, segments, lang, theme?)`** — Smart 模式 prompt：全文单次分析，提取 1-5 个关键片段。支持中英双语输出（title/quote/reason + _zh 字段），可按主题过滤。
- **`buildKeyMomentsChunkPrompt(title, segments, lang, theme?)`** — Fast 模式单 chunk prompt：复用 Smart prompt 但将数量限制为 1-2 个。
- **`buildKeyMomentsReducePrompt(title, candidates, fullTranscript, lang)`** — Fast 模式归并 prompt：从多个 chunk 的候选中选出最优 1-5 个，可微调 title/reason 但禁止改 quote/timestamp。
- **`buildStructuredSummaryPrompt(title, segments, lang)`** — 结构化摘要 prompt：提取 4-6 条核心要点，包含 label、insight、timestamps，输出双语。

### 内部工具

- **`transcriptForXmlPrompt(segments, maxChars)`** — 格式化字幕（默认 30K 字符上限），用于 CDATA 包裹的 XML prompt。
- **`selectSegments(segments)`** — 段选择策略：≤250 段全选，超过则头-中-尾采样（前 130 + 中间 90 + 尾部 60）。
- **`xmlEscape(text)`** — XML 转义工具函数。

### 语言支持

所有 prompt 通过 `lang` 参数支持 `"zh"` 和 `"en"` 两种输出语言，中文模式下所有字段输出中文，英文模式下输出英文 + 中文翻译字段。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `@/lib/types` | `KeyMoment`、`TranscriptSegment` 类型 |
| `@/lib/utils/time` | `formatTimestamp` |

### 被谁 import

- `lib/ai/provider.ts` — 导入全部四个 prompt 构建函数，用于 OpenAI 和 Gemini Provider 的关键片段与摘要生成。

## 关联的功能模块

- `lib/ai/provider.ts` — 使用这些 prompt 构建 AI 请求。
- `lib/ai/prompts.ts` — 基础版 prompt（分析/问答）。
