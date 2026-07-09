# video-workspace.tsx

**文件路径**：`components/video-workspace.tsx`

## 功能摘要

视频分析工作区主组件，协调视频播放器、转录文本、要点时刻、核心摘要、侧边栏标签页的所有状态和交互。

## 关键实现细节

- **状态管理**：metadata、transcript、analysis、moments、takeaways、currentTime、translating、loading、error、errorCode
- **数据加载**：
  1. `POST /api/video-analysis` 获取主分析数据（含字幕缓存）
  2. 成功后并行 `POST /api/generate-moments` + `POST /api/generate-summary`
- **播放时间轮询**：100ms setInterval 获取当前播放时间，驱动转录文本高亮
- **翻译懒加载**：切换到中英/中文模式时 `POST /api/translate-transcript`，支持 SSE 流式逐句返回
- **收藏功能**：
  - `handleSaveWord`：POST `/api/user-vocabulary`
  - `handleSaveQuote`：POST `/api/user-quotes`
- **词义定义**：`useWordDefinitions` Hook 从 transcript 自动提取单词释义
- **显示模式**：`useDisplayMode` Hook 管理 en/bilingual/zh
- **响应式布局**：桌面端 grid [1fr auto]（视频+摘要 | 侧边栏），移动端纵向堆叠
- **错误处理**：quota_exceeded 时显示登录/注册/升级引导按钮

## 依赖关系

- `gsap`、`@gsap/react`
- `lucide-react`（AlertCircle）
- `next/link`
- `@/components/navbar`、`@/components/highlights-panel`、`@/components/mobile-video-tabs`
- `@/components/sidebar-tabs`、`@/components/summary-panel`、`@/components/video-player`
- `@/lib/hooks/useDisplayMode`、`@/lib/hooks/useWordDefinitions`
- `@/lib/types`（GenerationDebug、JsonResponse、KeyMoment、SummaryTakeaway、TranscriptSegment、VideoAnalysis、VideoMetadata）

## 关联模块

- 视频详情页的核心组件，整合所有视频分析子组件
