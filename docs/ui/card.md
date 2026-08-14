# ui/card.tsx

**文件路径**：`components/ui/card.tsx`

## 功能摘要

卡片容器组件，包含 Card、CardHeader、CardTitle、CardContent 四个子组件。

## 关键实现细节

- **Card**：rounded-xl、border-white/10、bg-[#090909]、双重阴影（品牌蓝微光 + 深色投影）
- **CardHeader**：p-6、space-y-1.5
- **CardTitle**：text-[16px] font-semibold
- **CardContent**：px-6 pb-6

## 依赖关系

- `@/lib/utils/cn`

## 关联模块

- 全局 UI 基础组件，被 highlights-panel、summary-panel、transcript-viewer、chat-panel、notes-panel 使用
