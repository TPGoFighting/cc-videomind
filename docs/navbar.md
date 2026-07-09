# navbar.tsx

**文件路径**：`components/navbar.tsx`

## 功能摘要

全局顶部导航栏，包含 Logo、APP 下载链接、YouTube 状态告警、用户下拉菜单（登录/订阅/历史/单词本/句子本/笔记本/设置/退出）。

## 关键实现细节

- **认证状态**：从 `useAuth()` 获取 user、subscriptionTier
- **下拉菜单**：点击外部关闭、GSAP 弹性入场动画
- **订阅层级样式**：free（白灰）、pro（品牌蓝）、max（琥珀金）
- **滚动背景**：`requestAnimationFrame` 监听滚动，渐变调整 backgroundColor 和 backdropFilter
- **YouTube 状态**：非 available 时显示 `YouTubeStatusBanner`
- **骨架屏**：loading 时显示脉冲占位
- **响应式**：max-width 从 100% 到 80% 渐变适配

## 依赖关系

- `next/link`、`next/navigation`（useRouter）、`next/image`
- `gsap`、`@gsap/react`
- `lucide-react`（Clock、LogIn、LogOut、Menu）
- `@/components/auth-context`（useAuth）
- `@/lib/plans`（getPlanConfig）
- `@/components/game-icon`、`@/components/youtube-status-banner`
- `@/lib/hooks/useYouTubeStatus`

## 关联模块

- 全局导航入口，被 `video-workspace.tsx` 等页面引用
