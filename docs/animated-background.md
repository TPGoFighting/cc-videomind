# animated-background.tsx

**文件路径**：`components/animated-background.tsx`

## 功能摘要

全屏装饰性动画背景组件，使用 GSAP 驱动噪点纹理、网格点阵、几何图形、光束和光晕球的持续浮动动画，为页面提供深色科技感视觉基底。

## 关键实现细节

- **Props**：`variant` — `"desktop" | "mobile"`，控制图形密度和布局（桌面端 13 个图形，移动端 5 个）
- **形状类型**：circle、square、triangle、hexagon、cross、wire-ring、wire-double，通过 `ShapeRenderer` 子组件用 SVG 渲染
- **动画系统**：
  - 网格点阵：垂直循环移动（20s 周期）
  - 光晕球：随机 x/y 位移 + 缩放（12-20s 周期）
  - 几何图形：有机浮动 + 微旋转（14-26s 周期）
  - 光束：渐变背景位移实现扫描效果（仅桌面端）
- **无障碍**：`aria-hidden` 标记为装饰性元素，`pointer-events-none` 不拦截交互
- **响应式**：通过 `gsap.matchMedia` 尊重 `prefers-reduced-motion` 设置

## 依赖关系

- `gsap`、`@gsap/react`（useGSAP）
- React `useRef`

## 关联模块

- 被 `mobile-home.tsx`（variant="mobile"）引用
- 首页全局背景层
