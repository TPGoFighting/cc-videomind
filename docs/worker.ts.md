# worker.ts

## 文件路径
`worker.ts`

## 功能摘要
Cloudflare Workers 自定义入口文件。

## 关键实现细节
1. 重新导出 open-next 的默认 handler
2. 额外导出 RateLimiterDO 类（用于 Durable Objects 绑定）

## 依赖关系
- `.open-next/worker.js` - open-next 构建产物
- `./lib/security/rate-limiter-do` - 限流器 Durable Object

## 关联的功能模块
- Cloudflare Workers 部署
- 限流系统