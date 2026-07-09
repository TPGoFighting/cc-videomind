# summary-panel.tsx

**文件路径**：`components/summary-panel.tsx`

## 功能摘要

核心摘要面板，展示 AI 从视频中提取的摘要要点列表，每个要点包含标签、洞察和可跳转的时间戳。

## 关键实现细节

- **Props**：`takeaways: SummaryTakeaway[]`、`loading: boolean`、`onSeekTo?: (seconds: number) => void`
- **数据结构**：SummaryTakeaway 包含 label/label_zh、insight/insight_zh、timestamps 数组
- **时间戳按钮**：品牌蓝背景，点击调用 `onSeekTo`
- **骨架屏**：loading 时显示骨架文字 + 3 个骨架卡片
- **空状态**："AI 未能从此视频提取到摘要要点"
- **动画**：`stagger-children` 交错入场、`card-lift` 悬浮效果

## 依赖关系

- `lucide-react`（BookOpenCheck）
- `@/components/ui/card`（Card、CardContent、CardHeader、CardTitle）
- `@/lib/types`（SummaryTakeaway）
- `@/lib/utils/moments-validator`（parseTimestampToSeconds）

## 关联模块

- `video-workspace.tsx` 中渲染，数据来自 `/api/generate-summary`
