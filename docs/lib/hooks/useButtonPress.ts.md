# lib/hooks/useButtonPress.ts

## 文件路径
`lib/hooks/useButtonPress.ts`

## 功能摘要
按钮按压动画效果的 React Hook。

## 关键实现细节
1. `useButtonPress()` - 返回 ref 和事件处理器
   - `onMouseDown` - 按下时缩小到 0.94 倍
   - `onMouseUp` - 释放时恢复到 1 倍（带弹性效果）
   - `onMouseLeave` - 鼠标离开时恢复到 1 倍

## 依赖关系
- `react` - useCallback, useRef
- `gsap` - 动画库

## 关联的功能模块
- 按钮组件交互效果