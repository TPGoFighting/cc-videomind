# home/marquee-strip.tsx

**文件路径**：`components/home/marquee-strip.tsx`

## 功能摘要

首页关键词跑马灯装饰条，两行文字以不同方向无限循环滚动。

## 关键实现细节

- **两行文字**：
  - 行 1（方向 1）：精准转录、AI 问答、智能缓存、要点提取、单词收藏、句子笔记、间隔复习
  - 行 2（方向 -1）：Provider 架构、多模型支持、时间戳追溯、双语显示、闪卡测验、笔记导出、团队共享
- **MarqueeRow 子组件**：复制两份文字实现无缝循环，GSAP 30s 匀速循环
- **文字样式**：48px-80px 超大字体，WebkitTextStroke 描边（白色 8% 透明度），hover 时变蓝

## 依赖关系

- `gsap`、`@gsap/react`

## 关联模块

- 首页装饰性内容区
