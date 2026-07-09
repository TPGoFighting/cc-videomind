# wrangler.jsonc

## 文件路径
`wrangler.jsonc`

## 功能摘要
Cloudflare Workers 配置文件。

## 关键实现细节
1. Worker 入口：./worker.ts
2. 兼容性日期：2026-05-18
3. 兼容性标志：nodejs_compat, global_fetch_strictly_public
4. 静态资源：.open-next/assets
5. Durable Objects：
   - RATE_LIMITER: 限流器绑定

## 依赖关系
- wrangler

## 关联的功能模块
- Cloudflare Workers 部署
- 限流系统