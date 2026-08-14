# lib/hooks/useDisplayMode.ts

## 文件路径
`lib/hooks/useDisplayMode.ts`

## 功能摘要
显示模式切换 Hook（原文/译文/双语）。

## 关键实现细节
1. `useDisplayMode()` - 管理显示模式状态
   - 支持三种模式：`en`（原文）、`zh`（译文）、`bilingual`（双语）
   - 默认模式：`en`

## 依赖关系
- `react` - useState
- `@/lib/types` - DisplayMode 类型

## 关联的功能模块
- 字幕显示模式切换