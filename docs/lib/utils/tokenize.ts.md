# lib/utils/tokenize.ts

## 文件路径
`lib/utils/tokenize.ts`

## 功能摘要
英语单词分词和词形还原工具。

## 关键实现细节
1. `lemmatizeWord()` - 简单词形还原
   - 处理常见不规则动词变化（run/ran/running → run）
   - 处理规则屈折变化（-ing, -s, -ed, -ly, -er, -est 等）

2. `extractLemmas()` - 从字幕中提取去重后的 lemma 列表
   - 过滤停用词（STOP_WORDS）
   - 过滤非单词字符
   - 去重处理

## 依赖关系
- `@/lib/types` - TranscriptSegment 类型

## 关联的功能模块
- 单词定义获取（useWordDefinitions）
- 英语学习功能