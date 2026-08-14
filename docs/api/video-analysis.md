# app/api/video-analysis/route.ts

**文件路径**：`app/api/video-analysis/route.ts`

**功能摘要**：核心视频分析 API，接收 YouTube 或 Bilibili 视频 URL/ID，返回完整的元数据、转录文本和 AI 分析结果。

## 关键实现细节

- **HTTP 方法**：POST
- **最大执行时间**：300 秒（`maxDuration = 300`）
- **安全配置**：通过 `withSecurity` 中间件，限流 8 次/分钟，body 上限 64KB，scope 为 `video-analysis`

### 请求参数（Zod Schema）
- `url`（可选）：YouTube/Bilibili 视频 URL，最长 500 字符
- `videoId`（可选）：视频 ID（YouTube ID 或 BV/av 号）
- 二者必填其一

### 处理流程
1. **URL 解析**：动态判断是 Bilibili 还是 YouTube，调用对应的 `resolveBilibiliUrl` / `extractYouTubeVideoId` 提取 videoId
2. **缓存检查**：调用 `getCachedAnalysis` 查询 Supabase 缓存，若缓存命中且用户已解析过则直接返回
3. **配额检查**：调用 `checkAnalysisQuota` 检查用户配额（匿名用户限 1 条），超限返回 402
4. **元数据获取**：根据平台调用 `fetchYouTubeMetadata` 或 `fetchBilibiliMetadata`
5. **转录获取**：调用对应平台的 `TranscriptProvider.getTranscript()`
6. **自动翻译**：检测语言（中文→英文，英文→中文），分批（每批 30 句）并行翻译
7. **AI 分析**：调用 `getAiProvider(userId).generateAnalysis()` 生成分析
8. **缓存写入**：`upsertAnalysisCache` 持久化到 Supabase

### 返回值
```json
{
  "videoId": "string",
  "metadata": { "videoId", "title", "authorName", "thumbnailUrl", "providerUrl" },
  "transcript": [{ "startTime", "endTime", "text", "text_zh?" }],
  "analysis": { "summary?", "keyMoments?", "vocabulary?" },
  "cached": true/false,
  "preview": true/false  // 未登录用户为 true
}
```

### 配额消息构建
`buildQuotaMessage` 根据用户 tier（free/pro/max）返回不同提示：
- **free**：显示总次数上限
- **pro**：显示每日/每周上限
- **max**：提示联系技术支持

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 请求参数校验 |
| `@/lib/ai/provider` | AI 服务提供者（翻译、分析生成） |
| `@/lib/security/middleware` | 安全中间件（限流、CSRF 等） |
| `@/lib/supabase/cache` | 分析缓存读写 |
| `@/lib/supabase/quota` | 配额管理与用量记录 |
| `@/lib/utils/api` | 响应工具函数 |
| `@/lib/youtube/id` | YouTube videoId 提取 |
| `@/lib/youtube/metadata` | YouTube 元数据获取 |
| `@/lib/youtube/transcript-provider` | YouTube 转录获取 |
| `@/lib/bilibili/id` | Bilibili videoId 提取 |
| `@/lib/bilibili/metadata` | Bilibili 元数据获取 |
| `@/lib/bilibili/transcript-provider` | Bilibili 转录获取 |

## 关联功能模块

- 视频解析页面 `/video/[videoId]`
- 本地视频上传分析 `/api/video-analysis/upload`
- 视频元数据快速获取 `/api/video-analysis/meta`
- Bilibili 流式解析 `/api/bilibili-parse-stream`
