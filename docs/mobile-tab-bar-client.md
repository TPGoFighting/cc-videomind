# mobile-tab-bar-client.tsx

**文件路径**：`components/mobile-tab-bar-client.tsx`

## 功能摘要

MobileTabBar 的客户端包装组件，从 AuthContext 获取认证状态并传递给 MobileTabBar。

## 关键实现细节

- 从 `useAuth()` 获取 `user` 和 `loading`
- 计算 `isAuthenticated = !loading && user !== null`
- 渲染 `<MobileTabBar isAuthenticated={isAuthenticated} />`

## 依赖关系

- `@/components/auth-context`（useAuth）
- `./mobile-tab-bar`（MobileTabBar）

## 关联模块

- 全局布局中移动端渲染（需要客户端认证状态）
