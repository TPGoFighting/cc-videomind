# game-icon.tsx

**文件路径**：`components/game-icon.tsx`

## 功能摘要

统一的 SVG 图标组件，从 `/icons/` 目录加载预定义的游戏风格图标（user、menu、crown、fire、book 等 18 种）。

## 关键实现细节

- **Props**：`name: GameIconName`、`size?: number`（默认 16）、`className?`
- **图标映射**：ICONS 对象将名称映射到 `/icons/*.svg` 路径
- **GameIconName**：导出类型，为 18 个图标名的联合类型
- **渲染**：使用 `next/image` 加载 SVG，`unoptimized` 避免优化问题
- **容错**：找不到图标名时返回 null

## 依赖关系

- `next/image`
- `@/lib/utils/cn`

## 关联模块

- `mobile-tab-bar.tsx`（导航标签图标）
- `navbar.tsx`（导航栏图标：download、crown、fire、book、bookmark、notebook、settings、user）
