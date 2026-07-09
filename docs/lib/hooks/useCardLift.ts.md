# lib/hooks/useCardLift.ts

## 文件路径
`lib/hooks/useCardLift.ts`

## 功能摘要
卡片悬浮和按压动画效果的 React Hook。

## 关键实现细节
1. `useCardLift()` - 返回 ref 和事件处理器
   - `onMouseEnter` - 鼠标进入时上移 4px
   - `onMouseLeave` - 鼠标离开时恢复
   - `onMouseDown` - 按下时缩小到 0.98 倍
   - `onMouseUp` - 释放时恢复

## 依赖关系
- `react` - useCallback, useRef
- `gsap` - 动画库

## 关联的功能模块
- 卡片组件交互效果