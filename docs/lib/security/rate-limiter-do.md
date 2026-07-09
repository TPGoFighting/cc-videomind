# lib/security/rate-limiter-do.ts

**文件路径**：`lib/security/rate-limiter-do.ts`

## 功能摘要

Cloudflare Durable Object 实现，提供跨 Worker 实例共享的固定窗口速率限制计数器，解决内存 Map 在多实例场景下限流失效的问题。

## 关键实现细节

### `RateLimiterDO` 类
- 继承 `DurableObject`（来自 `cloudflare:workers`）。
- 构造函数接收 `DurableObjectState` 和 `env`。

### `fetch(request)`
- 从 URL 查询参数解析：`key`、`limit`、`window`。
- 参数校验：缺失或非法值返回 400。
- 从 `this.ctx.storage` 读取当前 bucket（`{ count, resetAt }`）。

#### 限流逻辑
1. **窗口过期或不存在** → 重置为 `{ count: 1, resetAt: now + windowMs }`。
2. **已达上限** → 返回 `{ allowed: false, remaining: 0 }`。
3. **未超限** → `count++`，写回 storage。

### 部署方式
- `wrangler.jsonc` 声明 `durable_objects` 绑定（`RATE_LIMITER`）与 migrations。
- 自定义 worker 入口（`worker.ts`）中 export 本类，使绑定能找到类。
- 每个 key 对应一个 DO 实例，storage 保存计数，实现跨实例共享。

## 依赖关系

- **外部依赖**：`cloudflare:workers`（DurableObject）、`@cloudflare/workers-types`（DurableObjectState）
- **被导入**：自定义 worker 入口（`worker.ts`）
- **配合使用**：`lib/security/rate-limit.ts`（`checkRateLimitAsync` 通过 HTTP 调用 DO）

## 关联功能模块

- 速率限制器（`rate-limit.ts`）
- API 安全中间件（`middleware.ts`）
- Cloudflare Workers 部署配置（`wrangler.jsonc`）
