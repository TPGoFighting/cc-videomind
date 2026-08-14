# ui/input.tsx

**文件路径**：`components/ui/input.tsx`

## 功能摘要

通用文本输入框组件，白色背景 + 圆角 + 品牌蓝 focus 样式。

## 关键实现细节

- **样式**：h-12、rounded-xl、border-white/15、bg-white/85
- **hover**：border-white/25、bg-white/95
- **focus-visible**：border-[#0099ff]、ring 蓝色、bg-white
- **disabled**：cursor-not-allowed、opacity-40
- **forwardRef**：支持 ref 转发

## 依赖关系

- `@/lib/utils/cn`
- React `forwardRef`

## 关联模块

- 全局 UI 基础组件，被 chat-panel、video-url-input 等使用
