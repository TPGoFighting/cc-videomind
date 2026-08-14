# lib/hooks/useCountUp.ts

## 文件路径
`lib/hooks/useCountUp.ts`

## 功能摘要
数字滚动动画 Hook（GSAP + ScrollTrigger 驱动）。

## 关键实现细节
1. `useCountUp()` - 数字滚动动画
   - 元素进入视口时触发
   - 使用 GSAP 动画库
   - 支持配置目标值和动画时长

## 依赖关系
- `react` - useEffect, useRef, useState
- `gsap` - 动画库
- `gsap/ScrollTrigger` - 滚动触发动画

## 关联的功能模块
- 统计数据展示