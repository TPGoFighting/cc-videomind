# app/api/notes/route.ts

**文件路径**：`app/api/notes/route.ts`

**功能摘要**：用户笔记 CRUD API，支持按视频获取笔记、保存笔记、删除笔记。

## 关键实现细节

### GET — 获取笔记列表
- **认证**：需登录
- **查询参数**：`videoId`（可选，按视频筛选）
- **限制**：最多返回 200 条
- **关联查询**：从 `video_analyses` 表加载视频标题

### POST — 保存笔记
- **安全配置**：限流 30 次/分钟，scope 为 `notes`
- **参数**（SaveRequestSchema）：
  - `videoId`：关联视频 ID
  - `body`：笔记内容，1-10000 字符
  - `timestampSeconds`：关联时间戳（秒，可选）

### DELETE — 删除笔记
- **参数**（DeleteRequestSchema）：`noteId`（UUID）
- **校验**：同时验证 `user_id`

### 返回值
```json
// GET
[{ "id", "video_id", "body", "timestamp_seconds", "created_at", "video_title" }]

// POST
{ "id", "body", "timestamp_seconds", "created_at", "video_id" }

// DELETE
{ "deleted": true }
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/server` | Supabase Service Client |
| `@/lib/youtube/id` | videoId 校验 |

## 关联功能模块

- 笔记本页面 `/notes`
- 视频工作区中的笔记功能
