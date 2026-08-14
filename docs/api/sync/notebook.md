# app/api/sync/notebook/route.ts

**文件路径**：`app/api/sync/notebook/route.ts`

**功能摘要**：生词本增量同步 API，支持离线收藏/取消收藏的双向合并，包含艾宾浩斯复习进度同步。

## 关键实现细节

- **HTTP 方法**：POST
- **安全配置**：限流 30 次/分钟，body 上限 4MB，scope 为 `sync-notebook`

### 请求参数（SyncRequestSchema）
- `lastSyncTime`：上次同步时间戳（毫秒）
- `localChanges`：本地变更数组
  - `lemma`：单词
  - `videoId`：来源视频
  - `updatedAt`：最后修改时间
  - `isDeleted`：是否已取消收藏
  - `reviewLevel`、`nextReviewAt`、`easeFactor`：复习进度参数

### 处理流程
1. **服务端合并**：遍历 `localChanges`
   - `isDeleted = true` → 删除 `user_vocabulary` 记录
   - `isDeleted = false` → upsert（覆盖复习进度）
2. **服务端拉取**：查询 `lastSyncTime` 之后的新建/修改记录
3. 返回增量数据供客户端同步

### 返回值
```json
{
  "success": true,
  "serverChanges": [{ "id", "lemma", "definitionZh", "videoId", "createdAt", "isDeleted" }],
  "mergedCount": 3,
  "syncTimestamp": 1705305600000
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/server` | Supabase Service Client |

## 关联功能模块

- 单词本 `/vocabulary`
- 用户词汇收藏 `/api/user-vocabulary`
- 复习进度管理
