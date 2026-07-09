# ui/button.tsx

**文件路径**：`components/ui/button.tsx`

## 功能摘要

通用按钮组件，基于 class-variance-authority 实现 5 种变体和 4 种尺寸。

## 关键实现细节

- **变体**：
  - `default`：纯白胶囊，主 CTA
  - `secondary`：毛玻璃胶囊，次级操作
  - `outline`：幽灵按钮，最弱操作
  - `ghost`：纯文本，导航等
  - `accent`：品牌蓝强调按钮
- **尺寸**：default（h-11）、sm（h-8）、lg（h-13）、icon（h-10 w-10）
- **通用样式**：rounded-full、focus-visible 蓝色 ring、disabled 透明度降级
- **forwardRef**：支持 ref 转发

## 依赖关系

- `class-variance-authority`（cva）
- `@/lib/utils/cn`
- React `forwardRef`

## 关联模块

- 全局 UI 基础组件，被 chat-panel、notes-panel、video-url-input 等广泛使用
