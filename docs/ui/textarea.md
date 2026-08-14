# ui/textarea.tsx

**文件路径**：`components/ui/textarea.tsx`

## 功能摘要

通用多行文本输入组件，白色背景 + 圆角 + 品牌蓝 focus 样式，与 Input 组件风格一致。

## 关键实现细节

- **样式**：min-h-28、rounded-xl、border-white/15、bg-white/85
- **交互状态**：与 Input 相同的 hover/focus-visible/disabled 样式
- **forwardRef**：支持 ref 转发

## 依赖关系

- `@/lib/utils/cn`
- React `forwardRef`

## 关联模块

- `notes-panel.tsx` 中用于笔记输入
