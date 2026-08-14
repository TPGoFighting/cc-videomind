# lib/bilibili/difficulty-analyzer.ts

## 文件路径

`lib/bilibili/difficulty-analyzer.ts`

## 功能摘要

视频词汇难度分析器，基于 CEFR 语言难度标准分析字幕全文，生成词汇难度画像和 10 秒粒度的生词密度热力图。

## 关键实现细节

### 接口

- **`LexicalDifficultyPortrait`** — 词汇难度画像：`{ a1a2, b1b2, c1c2, unranked }`，各字段为 0-1 的占比值。
- **`DifficultyAnalysisResult`** — 分析结果：包含 `portrait`（画像）和 `heatmap`（10s 粒度密度数组）。

### 常量

- **`ACADEMIC_WORDS`** — 核心中高级学术词汇集合（约 40 个），如 normalize、dynamic、haptic、transcode 等。
- **`HIGH_LEVEL_SUFFIXES`** — 高阶词根后缀/前缀（约 20 个），如 -morphism、-ation、-ology、trans-、syn- 等。

### 函数

- **`evaluateWordLevel(word)`** — 词汇难度判定：
  - 0（A1-A2 初级）：≤4 字母的短词、未匹配规则的普通词。
  - 1（B1-B2 中级）：≥7 字母且未匹配学术词库的词。
  - 2（C1-C2 高级）：匹配学术词库、匹配高阶词根特征。
- **`VideoDifficultyAnalyzer.analyze(transcript, totalDuration)`** — 静态方法：
  1. 初始化 10 秒时间槽热力图。
  2. 遍历字幕分句，提取英文单词并分级。
  3. 包含中高级生词的句子，按中点时间累加到对应时间槽（C1-C2 计双倍权重）。
  4. 计算各难度级别的占比画像。

### 输出格式

- `portrait.a1a2` — 初级词汇占比（保留 3 位小数）。
- `portrait.b1b2` — 中级词汇占比。
- `portrait.c1c2` — 高级词汇占比。
- `portrait.unranked` — 未分类词汇占比。
- `heatmap[i]` — 第 i 个 10 秒时间槽内的中高级生词密度。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `@/lib/types` | `TranscriptSegment` 类型 |

### 被谁 import

- 视频分析业务层调用 `VideoDifficultyAnalyzer.analyze()` 生成难度数据。

## 关联的功能模块

- `lib/bilibili/transcript-provider.ts` — 提供字幕数据作为分析输入。
