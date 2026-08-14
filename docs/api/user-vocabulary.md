# app/api/user-vocabulary/route.ts

**文件路径**：`app/api/user-vocabulary/route.ts`

**功能摘要**：用户单词收藏管理 API，支持获取列表、收藏单词、取消收藏。

## 关键实现细节

### GET — 获取收藏列表
- **认证**：需登录
- **查询参数**：`videoId`（可选，按视频筛选）
- **限制**：最多返回 200 条
- **关联查询**：JOIN `word_definitions` 表获取单词释义

### POST — 收藏单词
- **安全配置**：限流 30 次/分钟，scope 为 `user-vocabulary`
- **参数**（SaveWordRequestSchema）：`lemma`（单词原形）、`videoId`（来源视频）
- **流程**：
  1. 查找或创建 `word_definitions` 记录
  2. 通过 `upsert` 插入 `user_vocabulary`（unique 约束防重复）

### DELETE — 取消收藏
- **参数**：URL 查询参数 `id`（收藏记录 ID）
- **校验**：同时验证 `user_id` 确保只能删除自己的记录

### 返回值
```json
// GET
{ "vocabulary": [{ "id", "wordId", "lemma", "phonetic", "partOfSpeech", "definitionZh", "definitionEn", "exampleEn", "exampleZh", "videoId", "createdAt" }] }

// POST
{ "saved": true, "lemma": "string", "wordId": "string" }

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
| `@/lib/youtube/id` | videoId 校验 |

## 关联功能模块

- 单词本页面 `/vocabulary`
- 每日复习 `/review`
- 视频转录文本高亮收藏
