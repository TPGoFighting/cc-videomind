# home/bento-features.tsx

**文件路径**：`components/home/bento-features.tsx`

## 功能摘要

首页 Bento Grid 功能展示区，6 个核心功能卡片以不同尺寸排列在网格中，带 ScrollTrigger 入场动画。

## 关键实现细节

- **功能卡片**：精准转录（lg，2×2）、智能缓存（sm）、要点提取（sm）、对话问答（sm）、单词本与复习（sm）、接口可替换（wide，3列）
- **尺寸样式**：lg → md:col-span-2 md:row-span-2，wide → md:col-span-3
- **入场动画**：每个卡片 ScrollTrigger 滚动触发，0.7s 渐显 + 上移 + 缩放
- **交互**：glass-hover 悬浮效果，图标 hover 时变蓝

## 依赖关系

- `gsap`、`@gsap/react`、`gsap/ScrollTrigger`
- `lucide-react`（FileText、Zap、Lightbulb、MessageSquare、BookOpen、Sparkles）

## 关联模块

- 首页功能展示区
