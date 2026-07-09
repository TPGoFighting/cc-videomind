# lib/hooks/useScrollReveal.ts

## 文件路径
`lib/hooks/useScrollReveal.ts`

## 功能摘要
滚动显示动画 Hook（GSAP + ScrollTrigger）。

## 关键实现细节
1. `useScrollReveal<T>()` - 滚动显示动画
   - 子元素依次从下方淡入显示
   - 支持配置：y偏移、动画时长、交错延迟、触发位置
   - 使用 GSAP 的 `fromTo` 动画

## 依赖关系
- `react` - useRef
- `gsap` - 动画库
- `@gsap/react` - useGSAP Hook
- `@/lib/gsap/constants` - STAGGER 常量

## 关联的功能模块
- 页面滚动动画效果