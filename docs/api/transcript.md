# app/api/transcript/route.ts

**文件路径**：`app/api/transcript/route.ts`

**功能摘要**：获取视频转录字幕数据，优先返回缓存，缓存未命中时实时拉取并缓存。

## 关键实现细节

- **HTTP 方法**：POST
- **安全配置**：限流 12 次/分钟，body 上限 64KB，scope 为 `transcript`

### 请求参数（Zod Schema）
- `videoId`：视频 ID

### 处理流程
1. 校验参数
2. 查询缓存 `getCachedAnalysis(videoId)`
3. 缓存命中 → 直接返回 `transcript`
4. 缓存未命中 → 并行获取元数据和转录，然后写入缓存

### 返回值
```json
{
  "videoId": "string",
  "transcript": [{ "startTime", "endTime", "text", "text_zh?" }],
  "cached": true/false
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/youtube/id` | videoId 校验 |
| `@/lib/youtube/metadata` | YouTube 元数据 |
| `@/lib/youtube/transcript-provider` | 转录获取 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/cache` | 缓存读写 |

## 关联功能模块

- 视频工作区字幕显示
- 视频分析主接口
