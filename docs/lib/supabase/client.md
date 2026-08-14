# lib/supabase/client.ts

**文件路径**：`lib/supabase/client.ts`

## 功能摘要

创建浏览器端 Supabase 客户端实例，供客户端组件（如 React Client Components）直接调用。

## 关键实现细节

- **`createClient()`**：调用 `@supabase/ssr` 的 `createBrowserClient`，传入环境变量 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- 无任何封装逻辑，纯粹的工厂函数。

## 依赖关系

- **外部依赖**：`@supabase/ssr`
- **环境变量**：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **被导入**：前端组件、客户端 hooks 等需要浏览器端 Supabase 访问的模块

## 关联功能模块

- 前端页面/组件的用户认证、数据查询
- 与 `lib/supabase/server.ts`（服务端客户端）形成浏览器/服务端双端 Supabase 客户端体系
