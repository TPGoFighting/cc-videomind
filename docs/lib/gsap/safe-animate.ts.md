# lib/gsap/safe-animate.ts

## 文件路径
`lib/gsap/safe-animate.ts`

## 功能摘要
安全的 GSAP 动画包装函数，自动尊重 prefers-reduced-motion。

## 关键实现细节
1. `safeAnimate()` - 包装 GSAP 动画逻辑
   - 使用 `gsap.matchMedia()` 检测用户偏好
   - 仅在 `prefers-reduced-motion: no-preference` 时执行动画
   - 自动清理动画上下文

## 依赖关系
- `gsap` - 动画库

## 关联的功能模块
- 所有使用 GSAP 的动画组件