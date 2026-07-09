# app/api/generate-moments/route.ts

**文件路径**：`app/api/generate-moments/route.ts`

**功能摘要**：AI 生成视频关键时间戳要点（Key Moments），支持 smart/fast 两种模式和中英文输出。

## 关键实现细节

- **HTTP 方法**：POST
- **最大执行时间**：120 秒
- **安全配置**：限流 8 次/分钟，body 上限 2MB，scope 为 `generate-moments`

### 请求参数（GenerateMomentsRequestSchema）
- `videoId`：视频 ID
- `theme`：主题（可选）
- `mode`：`"smart"` | `"fast"` — 智能模式或快速模式
- `targetLanguage`：`"zh"` | `"en"` — 目标语言

### 处理流程
1. 查询 moments 缓存（基于 videoId + lang + mode + theme）
2. 缓存命中 → 直接返回
3. 缓存未命中 → 获取字幕（优先缓存，其次实时拉取，支持 Bilibili）
4. 调用 `aiProvider.generateKeyMoments()` 生成关键时刻
5. 写入缓存（非致命）

### 返回值
```json
{
  "moments": [{ "title", "timestamp", "quote" }],
  "mode": "smart" | "fast",
  "cached": true/false,
  "_debug": {}
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/cache-v2` | Moments 专用缓存 |
| `@/lib/supabase/cache` | 分析缓存（获取字幕） |
| `@/lib/ai/provider` | AI 生成关键时刻 |
| `@/lib/types` | Schema 定义 |
| `@/lib/youtube/metadata` | YouTube 元数据 |
| `@/lib/youtube/transcript-provider` | YouTube 转录 |

## 关联功能模块

- 视频工作区"关键时刻"标签页
- 视频摘要生成 `/api/generate-summary`
