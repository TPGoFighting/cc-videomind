# app/api/user-quotes/route.ts

**文件路径**：`app/api/user-quotes/route.ts`

**功能摘要**：用户句子收藏管理 API，支持获取收藏列表、收藏句子、删除收藏。

## 关键实现细节

### GET — 获取收藏列表
- **认证**：需登录
- **查询参数**：`videoId`（可选，按视频筛选）
- **限制**：最多返回 200 条
- **关联查询**：从 `video_analyses` 表加载视频标题

### POST — 收藏句子
- **安全配置**：限流 30 次/分钟，scope 为 `user-quotes`
- **参数**（SaveQuoteRequestSchema）：
  - `videoId`：来源视频 ID
  - `textEn`：英文原文
  - `textZh`：中文翻译（可选）
  - `startTime` / `endTime`：时间戳
  - `notes`：备注（可选）

### DELETE — 删除收藏
- **参数**：URL 查询参数 `id`
- **校验**：同时验证 `user_id`

### 返回值
```json
// GET
{ "quotes": [{ "id", "userId", "videoId", "textEn", "textZh", "startTime", "endTime", "notes", "createdAt", "videoTitle" }] }

// POST
{ "saved": true, "id": "string" }

// DELETE
{ "deleted": true }
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/server` | Supabase Service Client |
| `@/lib/types` | Schema 定义 |

## 关联功能模块

- 句子本页面 `/quotes`
- 视频转录文本中句子收藏
