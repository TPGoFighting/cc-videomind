# mobile-tab-bar.tsx

**文件路径**：`components/mobile-tab-bar.tsx`

## 功能摘要

移动端底部固定导航栏，展示 4 个主导航标签（播放/历史/学习/我的），使用 GameIcon 图标。

## 关键实现细节

- **Props**：`isAuthenticated: boolean`，控制需要登录的标签跳转目标
- **导航项**：从 `MAIN_NAV_ITEMS` 读取，通过 `ICON_MAP` 映射 lucide 图标名到 GameIcon 名称
- **高亮逻辑**：`matchPattern(pathname)` 匹配当前路径
- **未登录处理**：需要 `authRequired` 的标签未登录时跳转 `/login`
- **入场动画**：GSAP 从底部滑入（0.4s + back.out 缓动）
- **安全区域**：`env(safe-area-inset-bottom)` 适配 iPhone 底部
- **响应式**：仅 `md:hidden` 显示

## 依赖关系

- `next/link`、`next/navigation`（usePathname）
- `gsap`、`@gsap/react`
- `@/lib/navigation`（MAIN_NAV_ITEMS）
- `@/lib/utils/cn`
- `./game-icon`（GameIcon）

## 关联模块

- `mobile-tab-bar-client.tsx` 包装并注入认证状态
- 全局布局中移动端渲染
