# app/api/video-analysis/meta/route.ts

**文件路径**：`app/api/video-analysis/meta/route.ts`

**功能摘要**：快速获取视频元数据（标题、作者、缩略图），如果缓存中有完整分析结果则一并返回。始终在 2-3 秒内返回，不触发完整分析管线。

## 关键实现细节

- **HTTP 方法**：POST
- **安全配置**：限流 30 次/分钟，body 上限 16KB，scope 为 `video-meta`

### 请求参数
- `videoId`：视频 ID 字符串，1-100 字符

### 处理流程
1. 判断是否为 Bilibili ID（BV/av 号格式）
2. 查询缓存 `getCachedAnalysis(videoId)`
3. 缓存命中：
   - 有完整分析 → 返回 metadata + transcript + analysis
   - 仅元数据 → 返回 metadata（transcript/analysis 为 null）
4. 缓存未命中：实时调用 `fetchYouTubeMetadata` 或 `fetchBilibiliMetadata`（不回写缓存）

### 返回值
```json
{
  "videoId": "string",
  "metadata": { "videoId", "title", "authorName", "thumbnailUrl", "providerUrl" },
  "transcript": [] | null,
  "analysis": {} | null,
  "cached": true/false
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/youtube/id` | videoId 校验 |
| `@/lib/youtube/metadata` | YouTube 元数据 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/cache` | 缓存读取 |
| `@/lib/bilibili/metadata` | Bilibili 元数据（动态 import） |

## 关联功能模块

- 视频分析主接口 `/api/video-analysis`
- 视频工作区 `VideoWorkspace` 组件
