# home/scroll-nav.tsx

**文件路径**：`components/home/scroll-nav.tsx`

## 功能摘要

首页右侧固定滚动导航点，6 个圆点对应 6 个页面区域，高亮当前区域，点击平滑滚动。

## 关键实现细节

- **6 个区域**：首页、为什么、功能、数据、方案、路线图
- **ScrollTrigger**：每个区域 `data-section` 属性触发 onEnter/onEnterBack 更新 active 索引
- **导航点样式**：active 为 2.5px 蓝色圆点 + 蓝色光晕，inactive 为 2px 白色半透明
- **hover**：左侧显示白色标签文字
- **延迟显示**：1500ms 后才显示，避免首页加载闪现
- **仅 xl 显示**：`hidden xl:flex`

## 依赖关系

- `gsap`、`gsap/ScrollTrigger`、`@gsap/react`

## 关联模块

- 首页全局导航辅助
