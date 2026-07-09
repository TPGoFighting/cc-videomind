# lib/supabase/server.ts

**文件路径**：`lib/supabase/server.ts`

## 功能摘要

提供三种服务端 Supabase 客户端工厂函数，覆盖不同场景：用户会话（带 cookie）、Service Role（管理员权限）、认证验证（无持久化）。

## 关键实现细节

### `isSupabaseConfigured()`
检查环境变量是否已配置，返回 `boolean`。供其他函数做前置校验。

### `createSupabaseServerClient()`
- **异步函数**（使用 `await cookies()`）。
- 通过 `createServerClient` 创建服务端客户端，自动读写 Next.js cookies 实现会话管理。
- 未配置时返回 `null`。

### `createSupabaseServiceClient()`
- 使用 `SUPABASE_SERVICE_ROLE_KEY` 创建客户端，拥有管理员权限（绕过 RLS）。
- `persistSession: false`，不存储会话。
- 需要 `SUPABASE_SERVICE_ROLE_KEY` 环境变量，缺失时返回 `null`。

### `createSupabaseAuthClient()`
- 使用 anon key 创建，但禁用 `autoRefreshToken`、`detectSessionInUrl`、`persistSession`。
- 专门用于 Bearer Token 验证（如 API 路由的认证校验）。

## 依赖关系

- **外部依赖**：`next/headers`（cookies）、`@supabase/ssr`（createServerClient）、`@supabase/supabase-js`（createClient）
- **环境变量**：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
- **被导入**：`admin.ts`、`cache.ts`、`cache-v2.ts`、`cache-learn.ts`、`quota.ts` 及所有需要服务端 Supabase 访问的模块

## 关联功能模块

- 管理员权限系统（`admin.ts`）
- 视频分析缓存（`cache.ts`、`cache-v2.ts`）
- 词义缓存（`cache-learn.ts`）
- 配额管理（`quota.ts`）
