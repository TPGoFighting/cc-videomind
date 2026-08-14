# lib/supabase/quota.ts

**文件路径**：`lib/supabase/quota.ts`

## 功能摘要

配额管理核心模块，处理用户身份验证、订阅等级查询、分析配额检查（匿名/免费/付费/管理员）及使用记录写入。

## 关键实现细节

### `getBearerToken(request)`
- 从 `Authorization` 头提取 Bearer Token。
- 正则匹配 `/^Bearer\s+(.+)$/i`，返回 token 字符串或 `null`。

### `getAuthenticatedUser(request)`
- 优先尝试 Bearer Token → `createSupabaseAuthClient().getUser()`。
- 无 Token 则尝试 Cookie 会话 → `createSupabaseServerClient().getUser()`。
- 返回 `User | null`。

### `getAuthenticatedUserId(request)`
- `getAuthenticatedUser` 的便捷包装，返回 `userId` 或 `null`。

### `getProfileTier(userId)`
- 查询 `profiles.subscription_tier`，返回 `"free"` | `"pro"` | `"max"`。
- 无效值降级为 `"free"`。

### `hasUserAnalyzedVideo(userId, videoId, request)`
- 已登录用户：按 `user_id` + `video_id` 查 `usage_events`。
- 匿名用户：按 `ip_address` + `video_id` 查。

### `checkAnalysisQuota(userId, request?)`
- **匿名用户**：限 1 次，按 IP 计数。
- **管理员**：无上限（`Infinity`）。
- **免费用户**：总计 3 次（不按天/周重置），使用 `dailyLimit` 存储总限额。
- **付费用户**：日配额 + 周配额，基于 UTC+8 北京时间。
  - 日起始：`dayStart.setHours(dayStart.getHours() + 8, 0, 0, 0)`
  - 周起始：`getWeekStart()` 计算 UTC+8 本周一 00:00。
  - 使用 `Promise.all` 并行查询日/周使用量。

### `getWeekStart()`
- 计算 UTC+8 时区下本周一 00:00 的 UTC 时间戳。
- 处理周日（`day === 0`）偏移。

### `getClientIp(request)`
- 优先读 `x-forwarded-for`（取第一个），其次 `x-real-ip`，兜底 `"unknown"`。

### `recordAnalysisUsage({ userId, videoId, request })`
- 向 `usage_events` 插入使用记录。
- 匿名用户记录 IP，登录用户记录 userId。
- 登录用户额外 upsert 到 `user_videos` 表。

## 依赖关系

- **外部依赖**：`@supabase/supabase-js`（User 类型）
- **内部依赖**：`lib/supabase/server.ts`（三种客户端）、`lib/supabase/admin.ts`（`isAdmin`）、`lib/plans`（`SubscriptionTier`、`getPlanConfig`）
- **数据库表**：`usage_events`、`user_videos`、`profiles`
- **被导入**：API 路由（视频分析前的配额检查）

## 关联功能模块

- 订阅计划配置（`lib/plans`）
- 管理员权限（`admin.ts`）
- 视频分析 API（分析前检查配额、分析后记录用量）
