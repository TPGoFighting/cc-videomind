# app/api/bilibili-parse-stream/route.ts

**文件路径**：`app/api/bilibili-parse-stream/route.ts`

**功能摘要**：Bilibili 视频流式解析 API（SSE），支持短链还原、双层字幕提取、难度雷达分析，实时推送进度事件。

## 关键实现细节

- **HTTP 方法**：GET
- **Runtime**：Node.js（`export const runtime = "nodejs"`）
- **安全配置**：限流 12 次/分钟，scope 为 `bili-parse-stream`

### 查询参数
- `videoId`：Bilibili 视频 ID、BV 号或短链

### 处理流程
1. 还原短链（`resolveBilibiliUrl`）
2. 提取标准视频 ID（BV/av 号）
3. 调用 `BilibiliTranscriptProvider.getTranscript()` 执行流式拉取
4. 推送事件：`metadata` → `soft_subtitle`/`asr_chunk` → `complete`
5. 获取字幕后自动进行视频词汇难度雷达分析（`VideoDifficultyAnalyzer.analyze`）
6. 写入 Supabase 缓存

### SSE 事件
```
event: metadata
data: { "title", "authorName", "thumbnailUrl", "duration", ... }

event: soft_subtitle | asr_chunk
data: [{ "startTime", "endTime", "text" }]

event: difficulty
data: { "vocabulary": { "beginner", "intermediate", "advanced" }, ... }

event: complete
data: { "videoId", "transcript": [...] }

event: error
data: { "message": "..." }
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/bilibili/id` | 短链还原、ID 提取 |
| `@/lib/bilibili/transcript-provider` | Bilibili 转录 |
| `@/lib/bilibili/difficulty-analyzer` | 词汇难度分析 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/cache` | 缓存写入 |

## 关联功能模块

- Bilibili 视频解析入口
- 视频工作区
