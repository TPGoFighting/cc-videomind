# app/quotes/page.tsx

**文件路径**：`app/quotes/page.tsx`

**功能摘要**：句子本页面，展示和管理用户收藏的英语句子。

## 关键实现细节

- **组件类型**：客户端组件
- **数据获取**：调用 `/api/user-quotes` API
- **缓存**：`useCachedFetch` hook，支持 `mutate` 乐观更新

### 功能
1. **查看收藏列表**：按时间倒序
2. **删除收藏**：调用 DELETE `/api/user-quotes?id=xxx`，乐观更新
3. **跳转视频**：点击视频标题跳转

### 句子卡片
- 视频标题 + 时间戳
- 英文原文（引号包裹）
- 中文翻译（可选）
- 备注（可选）
- 日期 + 删除按钮

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/link` | 路由链接 |
| `lucide-react` | 图标 |
| `@/components/navbar` | 导航栏 |
| `@/components/auth-context` | 认证上下文 |
| `@/lib/hooks/useCachedFetch` | 数据缓存 |
| `@/lib/utils/time` | formatTimestamp |

## 关联功能模块

- API `/api/user-quotes`
- 视频转录文本句子收藏
