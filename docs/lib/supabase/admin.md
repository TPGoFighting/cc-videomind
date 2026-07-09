# lib/supabase/admin.ts

**文件路径**：`lib/supabase/admin.ts`

## 功能摘要

管理员权限管理模块，包括用户角色判断、全局配置 CRUD、用户个人 AI 配置管理、以及管理员自动提升逻辑。

## 关键实现细节

### `isAdmin(userId)`
- 查询 `profiles` 表的 `role` 字段，判断是否为 `"admin"`。
- 使用 `createSupabaseServerClient()`（普通用户权限）。

### `getAppSettings()`
- 读取 `app_settings` 表所有 key-value 对。
- 返回 `Record<string, string>` 格式。

### `updateAppSetting(key, value, userId)`
- 使用 service client（管理员权限）写入 `app_settings`。
- 通过 `upsert` 实现，记录 `updated_by` 和 `updated_at`。

### `getUserAiSettings(userId)`
- 读取 `user_ai_settings` 表中指定用户的所有配置。
- 空字符串值被视为未设置，过滤掉。

### `updateUserAiSetting(userId, key, value)`
- Upsert 用户个人 AI 配置。传 `value=""` 等效于删除。

### `deleteUserAiSetting(userId, key)`
- 删除指定用户的单条 AI 配置。

### `promoteToAdminIfEligible(userId, email)`
- 检查邮箱是否匹配 `ADMIN_EMAIL` 环境变量（逗号分隔）。
- 匹配则将 `profiles.role` 设为 `"admin"`。
- 使用 service client 绕过 RLS（用户 profile 可能刚创建）。

## 依赖关系

- **内部依赖**：`lib/supabase/server.ts`（`createSupabaseServerClient`、`createSupabaseServiceClient`）
- **数据库表**：`profiles`、`app_settings`、`user_ai_settings`
- **环境变量**：`ADMIN_EMAIL`
- **被导入**：`quota.ts`（调用 `isAdmin` 判断是否免配额）

## 关联功能模块

- 用户认证与注册流程（管理员自动提升）
- 系统设置管理
- 用户个性化 AI 配置
- 配额管理（`quota.ts`）
