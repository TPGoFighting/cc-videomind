# home/roadmap-section.tsx

**文件路径**：`components/home/roadmap-section.tsx`

## 功能摘要

首页路线图区域，展示 7 个里程碑（已完成/进行中/规划中），桌面端用 SVG 贝塞尔曲线时间线，移动端用单列。

## 关键实现细节

- **里程碑**：2025 Q4（AI 引擎）、2026 Q1（知识库）、2026 Q2（并发优化）、2026 Q3（App/多语言）、2026 Q4（笔记导出）、2027 Q1（AI 学习路径）
- **状态样式**：done（蓝色 CheckCircle2）、wip（琥珀色 CircleDot + pulse）、planned（白色 Circle）
- **SVG 曲线**：DrawSVGPlugin 驱动贝塞尔路径绘制，ScrollTrigger scrub 跟随滚动
- **节点入场**：左右交错滑入 + 缩放
- **移动端**：单列左侧竖线 + 圆点

## 依赖关系

- `gsap`、`@gsap/react`、`gsap/DrawSVGPlugin`、`gsap/ScrollTrigger`
- `lucide-react`（CheckCircle2、CircleDot、Circle）

## 关联模块

- 首页底部路线图区
