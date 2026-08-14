# chat-panel.tsx

**文件路径**：`components/chat-panel.tsx`

## 功能摘要

基于视频转录内容的 AI 对话问答面板，支持建议问题点击、自由提问，答案中的时间戳可点击跳转到视频对应位置。

## 关键实现细节

- **Props**：`videoId`、`suggestedQuestions`、`compact?`（紧凑模式）、`onSeekTo?`（跳转回调）
- **双模式渲染**：`compact` 模式用于侧边栏/移动端标签页，非 compact 模式带 Card 外壳
- **时间戳解析**：`parseTimestampToSeconds` 将 "0:30"、"1:05"、"1:30:20" 格式转为秒数
- **renderWithTimestamps**：正则匹配答案文本中的时间戳，渲染为可点击按钮
- **API 调用**：`POST /api/chat`，发送 `{ videoId, question }`，返回 `ChatAnswer`（answer + citations）
- **状态管理**：`answers` 数组按倒序存储问答历史，`loading`/`error` 控制 UI 状态
- **引用展示**：每个 citation 包含 startTime、endTime、quote，时间戳可跳转

## 依赖关系

- `lucide-react`（MessageSquare、Send）
- `@/components/ui/button`、`@/components/ui/card`、`@/components/ui/input`
- `@/lib/types`（ChatAnswer、JsonResponse）
- `@/lib/utils/time`（formatTimestamp）

## 关联模块

- `sidebar-tabs.tsx`、`mobile-video-tabs.tsx` 中作为标签页内容
- `video-workspace.tsx` 提供 `onSeekTo` 回调
