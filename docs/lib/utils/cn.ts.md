# lib/utils/cn.ts

## 文件路径
`lib/utils/cn.ts`

## 功能摘要
合并 Tailwind CSS 类名的工具函数。

## 关键实现细节
1. `cn()` - 合并多个 ClassValue
   - 使用 `clsx` 处理条件类名
   - 使用 `twMerge` 合并 Tailwind 类（避免冲突）

## 依赖关系
- `clsx` - ClassValue 类型
- `tailwind-merge` - twMerge 函数

## 关联的功能模块
- 所有使用 Tailwind CSS 的组件