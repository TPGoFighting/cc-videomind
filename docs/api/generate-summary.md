# app/api/generate-summary/route.ts

**文件路径**：`app/api/generate-summary/route.ts`

**功能摘要**：AI 生成视频结构化摘要（Takeaways），从字幕中提取核心观点和洞察。

## 关键实现细节

- **HTTP 方法**：POST
- **最大执行时间**：120 秒
- **安全配置**：限流 8 次/分钟，body 上限 2MB，scope 为 `generate-summary`

### 请求参数（GenerateSummaryRequestSchema）
- `videoId`：视频 ID
- `targetLanguage`：`"zh"` | `"en"` — 目标语言

### 处理流程
1. 查询摘要缓存（基于 videoId + lang）
2. 缓存命中 → 直接返回 takeaways
3. 缓存未命中 → 获取字幕（优先缓存，其次实时拉取，支持 Bilibili）
4. 调用 `aiProvider.generateStructuredSummary()` 生成结构化摘要
5. 写入缓存（非致命）

### 返回值
```json
{
  "takeaways": [{ "label", "insight", "timestamps" }],
  "cached": true/false,
  "_debug": {}
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/cache-v2` | 摘要专用缓存 |
| `@/lib/supabase/cache` | 分析缓存 |
| `@/lib/ai/provider` | AI 生成摘要 |
| `@/lib/types` | Schema 定义 |
| `@/lib/youtube/metadata` | YouTube 元数据 |
| `@/lib/youtube/transcript-provider` | YouTube 转录 |

## 关联功能模块

- 视频工作区"摘要"标签页
- 关键时刻生成 `/api/generate-moments`
