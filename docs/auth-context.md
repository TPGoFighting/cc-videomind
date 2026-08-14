# auth-context.tsx

**文件路径**：`components/auth-context.tsx`

## 功能摘要

基于 React Context 的全局认证状态管理，封装 Supabase Auth 会话监听、用户 profile 获取（角色/订阅层级）、登录状态变更同步。

## 关键实现细节

- **AuthProvider**：顶层 Provider 组件，维护 user、session、loading、isAdmin、subscriptionTier 状态
- **useAuth()**：自定义 Hook，返回 `{ user, session, loading, isAdmin, subscriptionTier, signOut, refreshProfile }`
- **Profile 获取**：通过 `/api/me` 接口获取用户角色和订阅层级，失败时保持默认值（free）
- **会话监听**：`supabase.auth.onAuthStateChange` 实时同步登录/登出状态
- **signOut**：调用 Supabase signOut 并重置本地状态
- **refreshProfile**：手动触发重新获取 profile 信息

## 依赖关系

- `@supabase/supabase-js`（User、Session 类型）
- `@/lib/supabase/client`（createClient）
- `@/lib/plans`（SubscriptionTier 类型）
- React Context API（createContext、useContext）

## 关联模块

- `navbar.tsx`、`mobile-tab-bar.tsx`、`mobile-tab-bar-client.tsx`、`pricing-section.tsx`、`notes-panel.tsx` 等需要认证状态的组件
