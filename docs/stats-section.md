# stats-section.tsx

**文件路径**：`components/stats-section.tsx`

## 功能摘要

首页数据统计展示区，用数字递增动画展示已解析视频数、学习笔记数、AI 问答数、收录单词数。

## 关键实现细节

- **数据**：4 项统计（12580+、47300+、89200+、156000+）
- **AnimatedStat 子组件**：使用 `useCountUp` Hook 实现数字递增（2000ms）
- **入场动画**：GSAP ScrollTrigger 滚动触发，0.8s 渐显 + 上移，stagger 0.15s
- **数字样式**：`text-gradient` 渐变色，响应式字体大小 44px → 56px → 64px

## 依赖关系

- `gsap`、`@gsap/react`（useGSAP + ScrollTrigger）
- `@/lib/hooks/useCountUp`

## 关联模块

- 首页 `stats-section` 数据展示
