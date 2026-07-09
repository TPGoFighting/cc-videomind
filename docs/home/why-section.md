# home/why-section.tsx

**文件路径**：`components/home/why-section.tsx`

## 功能摘要

首页"为什么做这个"区域，通过三个场景（被动观看→结构化需求→Teach Player 解决方案）阐述产品价值。

## 关键实现细节

- **三段叙事**：每段配自定义 SVG 图标（电视/大脑/文档+加号）
- **桌面端**：沉浸式场景流，每个场景包含左侧/右侧 3D 模型 + 对侧文字卡片
- **3D 模型**：stork（鹳）+ table、flamingo（火烈鸟）、parrot（鹦鹉）
- **滚动动画**：ScrollTrigger scrub 模式，卡片随滚动渐显 + 缩放
- **移动端**：纵向堆叠卡片，无 3D 模型
- **响应式**：isMobile state 控制布局切换

## 依赖关系

- `gsap`、`@gsap/react`
- `@/components/glb-decoration`（GlbDecoration）
- `@/lib/glb-models`（GLB_MODELS.stork/table/flamingo/parrot）
- `@/lib/gsap/constants`（EASE）

## 关联模块

- 首页第二个内容区
