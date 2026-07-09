# lib/security/middleware.ts

**文件路径**：`lib/security/middleware.ts`

## 功能摘要

API 路由安全中间件，提供 HTTP 方法校验、CSRF 防护、请求体大小限制和速率限制的统一包装器。

## 关键实现细节

### `validateCsrf(request)`
- GET/HEAD 请求跳过校验。
- 检查 `Origin` 或 `Referer` 头的 hostname。
- 允许的域名：`localhost`、`*.vercel.app`、`video.tpgofighting.top`、`*.tpgofighting.top`。

### `SecurityConfig` 接口
| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `allowedMethods` | `string[]` | `["GET", "POST"]` | 允许的 HTTP 方法 |
| `maxBodySize` | `number` | `1024 * 1024`（1MB） | 请求体最大字节数 |
| `rateLimit` | `{ maxRequests, windowMs }` | 无 | 限流配置 |
| `scope` | `string` | `"api"` | 限流 key 作用域 |
| `skipCsrf` | `boolean` | `false` | 跳过 CSRF 校验 |
| `skipBodySize` | `boolean` | `false` | 跳过 body 大小校验 |

### `withSecurity(config)`
- 返回 `{ wrap(request, handler) }` 对象。
- 按顺序执行：方法检查 → CSRF 检查 → Body 大小检查 → 限流 → 执行 handler。
- 限流使用 `checkRateLimitAsync`（异步，支持 Durable Object）。
- 限流触发返回 429 + `Retry-After: 60` + `X-RateLimit-Reset` 头。

## 依赖关系

- **内部依赖**：`next/server`（NextResponse）、`lib/security/rate-limit.ts`（`checkRateLimitAsync`、`getClientKey`）
- **被导入**：各 API 路由入口

## 关联功能模块

- 速率限制系统（`rate-limit.ts`）
- API 路由安全策略
