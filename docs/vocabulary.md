# app/vocabulary/page.tsx

**文件路径**：`app/vocabulary/page.tsx`

**功能摘要**：单词本页面，展示和管理用户收藏的英语单词及释义。

## 关键实现细节

- **组件类型**：客户端组件
- **数据获取**：调用 `/api/user-vocabulary` API
- **缓存**：`useCachedFetch` hook，支持 `mutate` 乐观更新

### 功能
1. **查看单词列表**：按收藏时间倒序
2. **取消收藏**：调用 DELETE `/api/user-vocabulary?id=xxx`，乐观更新
3. **跳转视频**：点击视频图标跳转到来源视频

### 单词卡片
- 单词原形 + 音标 + 词性
- 中文释义
- 英文释义（可选）
- 例句（可选）
- 收藏日期 + 操作按钮

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/link` | 路由链接 |
| `lucide-react` | 图标 |
| `@/components/navbar` | 导航栏 |
| `@/components/auth-context` | 认证上下文 |
| `@/lib/hooks/useCachedFetch` | 数据缓存 |

## 关联功能模块

- API `/api/user-vocabulary`
- API `/api/word-definitions`
- 视频转录文本高亮收藏
- 每日复习 `/review`
