# highlights-panel.tsx

**文件路径**：`components/highlights-panel.tsx`

## 功能摘要

要点时刻面板，展示 AI 从视频中提取的关键时刻列表，每个时刻包含标题、引用、理由，时间戳可点击跳转。

## 关键实现细节

- **Props**：`moments: KeyMoment[]`、`loading: boolean`、`onSeekTo?: (seconds: number) => void`
- **数据结构**：KeyMoment 包含 timestamp（"start-end" 格式）、title/title_zh、quote/quote_zh、reason/reason_zh
- **时间戳解析**：使用 `parseTimestampToSeconds` 从 `@/lib/utils/moments-validator`
- **骨架屏**：加载中显示 3 个 skeleton-wave 占位卡片
- **空状态**：显示"暂未找到可跳转的要点时刻"
- **动画**：`stagger-children` CSS 类控制子元素交错入场，`card-lift` 悬浮效果

## 依赖关系

- `lucide-react`（Sparkles）
- `@/components/ui/card`（Card、CardContent、CardHeader、CardTitle）
- `@/lib/types`（KeyMoment）
- `@/lib/utils/moments-validator`（parseTimestampToSeconds）

## 关联模块

- `video-workspace.tsx` 中渲染，数据来自 `/api/generate-moments`
