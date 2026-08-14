# app/api/history/route.ts

**文件路径**：`app/api/history/route.ts`

**功能摘要**：获取用户解析视频的历史记录列表。

## 关键实现细节

- **HTTP 方法**：GET
- **认证**：需登录（未登录返回空数组）
- **限制**：最多返回 50 条
- **关联查询**：JOIN `video_analyses` 表获取视频标题、缩略图、频道名
- **排序**：按解析时间倒序

### 返回值
```json
{
  "data": [{
    "videoId": "string",
    "title": "string",
    "thumbnail": "string",
    "channelName": "string",
    "parsedAt": "ISO 日期"
  }]
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/server` | Supabase Service Client |
| `@/lib/utils/api` | 响应工具 |

## 关联功能模块

- 历史记录页面 `/history`
- 视频工作区
