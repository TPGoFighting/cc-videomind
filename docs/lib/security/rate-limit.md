# lib/security/rate-limit.ts

**文件路径**：`lib/security/rate-limit.ts`

## 功能摘要

速率限制器核心模块，提供内存版（本地开发/兜底）和 Durable Object 版（生产环境跨实例共享）两种实现，以及安全的客户端标识提取。

## 关键实现细节

### `RateLimitResult` 接口
- `allowed: boolean`、`remaining: number`、`resetAt?: number`。

### 内存版限流（同步）

#### `checkRateLimit(key, limit, windowMs)`
- 基于 `Map<string, Bucket>` 的固定窗口计数器。
- 窗口过期或不存在时重置为 `{ count: 1, resetAt: now + windowMs }`。
- 未超限则 `count++`。

#### `cleanExpiredBuckets(now)`
- 每 ~200 次请求或 bucket 超 2000 个时触发清理，防止内存泄漏。

### Durable Object 版限流（异步）

#### `shouldUseDurableObject()`
- 仅 `NODE_ENV === "production"` 时尝试使用。

#### `getRateLimiterNamespace()`
- 动态 `import("@opennextjs/cloudflare")` 获取 `RATE_LIMITER` 绑定。
- 失败时返回 `undefined`，回退到内存实现。

#### `checkRateLimitAsync(key, limit, windowMs)`
- 优先通过 Durable Object 共享计数。
- 向 DO stub 发送 HTTP 请求：`https://rate-limiter.internal/check?key=...&limit=...&window=...`。
- 不可用时自动回退 `checkRateLimit`（内存版）。

### 客户端标识提取

#### `getClientKey(request, scope)`
- IP 信任优先级：
  1. `cf-connecting-ip`（Cloudflare 注入，最可靠）
  2. `x-vercel-forwarded-for`（Vercel 注入）
  3. `x-real-ip`（受信任反代注入）
- 无平台真实 IP 时，降级为统一 key `untrusted`，防止伪造 `x-forwarded-for` 绕过限流。
- key 格式：`${scope}:${ip}` 或 `${scope}:untrusted`。

## 依赖关系

- **外部依赖**：`@opennextjs/cloudflare`（运行时动态导入）、`@cloudflare/workers-types`（类型声明）
- **全局声明**：`CloudflareEnv.RATE_LIMITER`
- **被导入**：`lib/security/middleware.ts`（`checkRateLimitAsync`、`getClientKey`）
- **关联 DO**：`lib/security/rate-limiter-do.ts`（`RateLimiterDO` 类）

## 关联功能模块

- API 安全中间件（`middleware.ts`）
- Durable Object 实现（`rate-limiter-do.ts`）
- Cloudflare Workers 部署配置
