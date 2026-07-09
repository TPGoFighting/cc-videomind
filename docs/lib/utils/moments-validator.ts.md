# lib/utils/moments-validator.ts

## 文件路径
`lib/utils/moments-validator.ts`

## 功能摘要
AI 输出的要点时刻和摘要验证、解析、去重工具。

## 关键实现细节
1. 时间戳转换函数：
   - `parseTimestampToSeconds()` - 将 "M:SS" 格式转为秒数
   - `secondsToTimestamp()` - 将秒数转为 "M:SS" 格式
   - `parseTimestampRange()` - 解析 "MM:SS-MM:SS" 范围

2. 文本规范化：
   - `normalizeText()` - 转小写、去除标点和多余空格

3. 引文验证：
   - `verifyQuoteInTranscript()` - 检查 quote 是否能在字幕中找到（模糊匹配）
   - 支持时间范围搜索和全字幕回退

4. AI 输出解析：
   - `parseKeyMoments()` - 解析 AI 返回的 JSON 为 KeyMoment 数组
   - `parseSummaryTakeaways()` - 解析 AI 返回的 JSON 为 SummaryTakeaway 数组
   - 支持 JSON 修复和容错处理

5. 去重与验证：
   - `validateAndDedupMoments()` - 验证并去重 moments
   - `validateSummaryTakeaways()` - 验证摘要 takeaways 的时间戳引用

## 依赖关系
- `@/lib/types` - KeyMomentSchema, SummaryTakeawaySchema 等
- `@/lib/utils/json` - extractBalancedJson, repairBrokenJson

## 关联的功能模块
- AI 要点时刻生成
- AI 结构化摘要生成