# lib/utils/chunk.ts

## 文件路径
`lib/utils/chunk.ts`

## 功能摘要
将字幕文本按时间切片，支持重叠和最小分段数控制。

## 关键实现细节
1. `chunkTranscript()` - 将字幕按时间切片
   - 按累计时间切片（非段数），保证重叠、末帧完整
   - 支持配置：chunkMinutes（默认5分钟）、overlapSeconds（默认45秒）、minChunkSegments（默认3段）
   - 自动处理短字幕（少于 minChunkSegments*2 时不切片）

2. `totalDuration()` - 估算字幕总时长（秒）

## 依赖关系
- `@/lib/types` - TranscriptSegment 类型

## 关联的功能模块
- AI 分析（长视频分块处理）
- 字幕处理和显示