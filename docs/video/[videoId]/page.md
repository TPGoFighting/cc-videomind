# app/video/[videoId]/page.tsx

**文件路径**：`app/video/[videoId]/page.tsx`

**功能摘要**：视频工作区页面，根据 URL 中的 videoId 渲染 `VideoWorkspace` 组件。

## 关键实现细节

- **组件类型**：服务端组件（async）
- **路由参数**：`videoId`（动态段）
- **校验**：使用 `VideoIdSchema` 校验 videoId 格式，无效则返回 404

### 渲染逻辑
1. 从 URL params 获取 videoId
2. 校验格式
3. 渲染 `<VideoWorkspace videoId={parsed.data} />`

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/navigation` | notFound |
| `@/components/video-workspace` | 视频工作区主组件 |
| `@/lib/youtube/id` | VideoIdSchema 校验 |

## 关联功能模块

- 视频工作区组件（包含字幕、分析、问答、笔记等功能）
- 首页 URL 输入
- 历史记录、探索页面跳转
