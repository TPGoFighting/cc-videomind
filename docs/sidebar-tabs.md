# sidebar-tabs.tsx

**文件路径**：`components/sidebar-tabs.tsx`

## 功能摘要

桌面端视频详情页右侧标签页容器，包含转录文本、Chat、笔记、复习四个标签，固定在视口右侧。

## 关键实现细节

- **Props**：与 `mobile-video-tabs.tsx` 相同，接收完整视频分析状态
- **标签页**：transcript、chat、notes、review，横向排列在顶部
- **布局**：`h-full flex flex-col`，内容区 `flex-1 min-h-0 overflow-hidden`
- **切换动画**：GSAP 0.25s 渐显 + 上移
- **转录文本**：hideHeader 模式，与 mobile-video-tabs 共享 TranscriptViewer
- **Chat/笔记**：compact 模式，外层包裹 `overflow-auto p-4`
- **复习**：引导跳转 `/review`

## 依赖关系

- `gsap`、`@gsap/react`
- `lucide-react`（FileText、Flame、MessageSquare、NotebookPen）
- `next/link`
- `./transcript-viewer`、`./chat-panel`、`./notes-panel`
- `@/lib/types`

## 关联模块

- `video-workspace.tsx` 在桌面端渲染此组件
- 与 `mobile-video-tabs.tsx` 功能对应
