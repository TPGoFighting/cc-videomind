# lib/hooks/useWordDefinitions.ts

## 文件路径
`lib/hooks/useWordDefinitions.ts`

## 功能摘要
批量获取单词定义的 React Hook。

## 关键实现细节
1. `useWordDefinitions()` - 批量获取单词定义
   - 从字幕中提取 lemma 列表
   - 通过 API 批量获取单词定义
   - 使用 SWR 进行数据缓存和请求去重
   - 返回单词定义 Map

2. 优化措施：
   - lemma 列表截断到 400 个（API 限制）
   - 使用哈希缩短 SWR key
   - 120 秒请求去重间隔

## 依赖关系
- `react` - useMemo
- `swr` - 数据获取和缓存
- `@/lib/types` - TranscriptSegment, WordDefinition 类型
- `@/lib/utils/tokenize` - extractLemmas 函数

## 关联的功能模块
- 单词卡片显示
- 英语学习功能