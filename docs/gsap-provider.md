# gsap-provider.tsx

**文件路径**：`components/gsap-provider.tsx`

## 功能摘要

GSAP 插件全局注册 Provider，在应用顶层一次性注册 ScrollTrigger、ScrollToPlugin 等插件。

## 关键实现细节

- **Props**：`children`
- **注册逻辑**：useEffect 中调用 `gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollToPlugin)`
- **渲染**：直接透传 children，无额外 DOM

## 依赖关系

- `gsap`、`gsap/ScrollTrigger`、`gsap/ScrollToPlugin`、`@gsap/react`

## 关联模块

- 应用根布局中包裹，为所有子组件提供 GSAP 插件支持
