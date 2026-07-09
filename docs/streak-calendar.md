# streak-calendar.tsx

**文件路径**：`components/streak-calendar.tsx`

## 功能摘要

学习打卡日历组件，展示近 30 天的学习热力图（类似 GitHub contributions），包含连续天数统计。

## 关键实现细节

- **Props**：`data: { date: string; count: number }[]`、`streak: number`
- **网格生成**：近 30 天 7×5 网格，自动补齐到周日起始
- **热力等级**：0-4 级（white/6 → green-500/20 → green-500/35 → green-500/55 → green-500），基于 count 阈值 0/10/15/20
- **今日高亮**：ring-1 ring-white/20
- **图例**：底部显示 少→多 五级颜色条
- **星期头**：中文显示 一二三四五六日

## 依赖关系

- `@/lib/utils/cn`
- React `useMemo`

## 关联模块

- `/review` 复习页面展示打卡记录
