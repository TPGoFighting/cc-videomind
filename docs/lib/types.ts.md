# lib/types.ts

## 文件路径
`lib/types.ts`

## 功能摘要
项目所有 Zod Schema 和 TypeScript 类型定义。

## 关键实现细节
1. 核心数据 Schema：
   - `TranscriptSegmentSchema` - 字幕片段
   - `VideoMetadataSchema` - 视频元数据
   - `HighlightSchema` - 视频亮点
   - `CitationSchema` - 引用
   - `VideoAnalysisSchema` - 视频分析结果
   - `ChatAnswerSchema` - 聊天回答

2. 要点时刻 Schema：
   - `KeyMomentSchema` - 要点时刻（含时间戳格式验证）
   - `SummaryTakeawaySchema` - 结构化摘要

3. 请求 Schema：
   - `GenerateMomentsRequestSchema` - 生成要点时刻请求
   - `GenerateSummaryRequestSchema` - 生成摘要请求

4. 英语学习 Schema：
   - `WordDefinitionSchema` - 单词定义
   - `UserQuoteSchema` - 用户摘抄
   - `ReviewResultSchema` - 复习结果

5. 其他类型：
   - `JsonResponse<T>` - 统一 API 响应格式
   - `GenerationDebug` - 生成调试信息
   - `DisplayMode` - 显示模式

## 依赖关系
- `zod` - Schema 定义和验证

## 关联的功能模块
- 所有 API 路由（输入验证）
- 所有数据模型