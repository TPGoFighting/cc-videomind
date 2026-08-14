# lib/gsap/constants.ts

## 文件路径
`lib/gsap/constants.ts`

## 功能摘要
GSAP 动画常量定义。

## 关键实现细节
1. `DURATION` - 动画时长常量
   - instant: 0.15s
   - fast: 0.25s
   - normal: 0.45s
   - entrance: 0.7s
   - slow: 1.0s
   - reveal: 1.2s

2. `EASE` - 缓动函数常量
   - out: power3.out
   - in: power3.in
   - inOut: power3.inOut
   - smooth: power2.inOut
   - bounce: back.out(1.7)
   - snap: expo.out
   - soft: sine.inOut

3. `STAGGER` - 交错动画常量
   - tight: 0.04s
   - normal: 0.08s
   - loose: 0.15s

## 依赖关系
- 无外部依赖

## 关联的功能模块
- 所有使用 GSAP 的动画组件