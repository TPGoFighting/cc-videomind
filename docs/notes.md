# app/notes/page.tsx

**文件路径**：`app/notes/page.tsx`

**功能摘要**：笔记本页面，展示和管理用户在视频学习过程中记录的笔记。

## 关键实现细节

- **组件类型**：客户端组件
- **数据获取**：调用 `/api/notes` API
- **缓存**：`useCachedFetch` hook，支持 `mutate` 乐观更新

### 功能
1. **查看笔记列表**：按时间倒序，最多 200 条
2. **删除笔记**：调用 DELETE `/api/notes`，乐观更新列表
3. **跳转视频**：点击视频标题跳转到对应视频页面

### 状态处理
- 加载中：骨架屏
- 未登录：提示登录
- 无笔记：引导到视频播放页
- 有笔记：笔记卡片列表

### 笔记卡片
- 视频标题链接
- 笔记正文
- 时间戳 + 删除按钮

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/link` | 路由链接 |
| `lucide-react` | 图标 |
| `@/components/navbar` | 导航栏 |
| `@/components/auth-context` | 认证上下文 |
| `@/lib/hooks/useCachedFetch` | 数据缓存 |
| `@/lib/types` | UserNote 类型 |

## 关联功能模块

- API `/api/notes`
- 视频工作区笔记功能
