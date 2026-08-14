# app/api/admin/videos/route.ts

**文件路径**：`app/api/admin/videos/route.ts`

**功能摘要**：管理员查看全站所有已解析视频列表，包含解析者信息。

## 关键实现细节

- **HTTP 方法**：GET
- **认证**：仅管理员
- **限制**：最多返回 100 条
- **关联查询**：
  1. 从 `video_analyses` 获取视频元数据
  2. 从 `user_videos` 获取解析者 ID
  3. 从 `profiles` 获取解析者邮箱

### 返回值
```json
{
  "videos": [{
    "videoId": "string",
    "title": "string",
    "thumbnail": "string",
    "channelName": "string",
    "parsedAt": "ISO 日期",
    "parsedBy": "邮箱1, 邮箱2" | "匿名用户"
  }]
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/admin` | 管理员权限检查 |
| `@/lib/supabase/server` | Supabase Service Client |

## 关联功能模块

- 设置页面管理员视频面板
