# mobile-video-tabs.tsx

**文件路径**：`components/mobile-video-tabs.tsx`

## 功能摘要

移动端视频详情页的标签页容器，包含转录文本、Chat、笔记、复习四个标签，每个标签渲染对应子组件。

## 关键实现细节

- **Props**：接收 videoId、transcript、analysis、displayMode 等完整视频分析状态
- **标签页**：transcript（FileText）、chat（MessageSquare）、notes（NotebookPen）、review（Flame）
- **切换动画**：GSAP 0.25s 渐显 + 上移，`revertOnUpdate: true` 确保每次切换重置
- **转录文本**：传递 `hideHeader` 隐藏标题栏，节省移动端空间
- **Chat**：compact 模式，带 suggestedQuestions
- **笔记**：compact 模式
- **复习**：引导用户跳转到 `/review` 专属页面

## 依赖关系

- `gsap`、`@gsap/react`
- `lucide-react`（FileText、Flame、MessageSquare、NotebookPen）
- `next/link`
- `./transcript-viewer`、`./chat-panel`、`./notes-panel`
- `@/lib/types`（DisplayMode、TranscriptSegment、VideoAnalysis、WordDefinition）
- `@/lib/utils/cn`

## 关联模块

- `video-workspace.tsx` 在移动端渲染此组件
- 与 `sidebar-tabs.tsx` 功能对应（桌面端版本）
