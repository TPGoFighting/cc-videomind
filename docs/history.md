# app/history/page.tsx

**文件路径**：`app/history/page.tsx`

**功能摘要**：历史记录页面，展示用户解析过的所有视频列表。

## 关键实现细节

- **组件类型**：客户端组件
- **数据获取**：调用 `/api/history` API
- **缓存**：使用 `useCachedFetch` hook 缓存数据

### 状态处理
1. **加载中**：骨架屏（4 个卡片）
2. **未登录**：提示登录
3. **无记录**：引导开始解析
4. **有记录**：视频列表

### 列表项
- 缩略图 + 标题 + 频道名 + 解析日期
- 点击跳转 `/video/{videoId}`

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/image` | 图片优化 |
| `next/link` | 路由链接 |
| `lucide-react` | 图标 |
| `@/components/navbar` | 导航栏 |
| `@/components/auth-context` | 认证上下文 |
| `@/lib/hooks/useCachedFetch` | 数据缓存 hook |

## 关联功能模块

- 视频工作区
- API `/api/history`
