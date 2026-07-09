// worker.ts — 自定义 Cloudflare Worker 入口
//
// @opennextjs/cloudflare 默认把 Next.js 产物打包到 .open-next/worker.js 并作为 Worker 的
// main 运行。但 Durable Objects 要求 DO 类必须从 Worker 的 main 模块导出，而 open-next
// 生成的 worker 不会导出我们的 DO 类。因此这里做一层薄封装：
//   - 原样 re-export open-next 的默认 handler；
//   - 额外 export RateLimiterDO，使 wrangler.jsonc 中的 RATE_LIMITER 绑定能找到类。
//
// wrangler.jsonc 的 "main" 已指向本文件（取代 .open-next/worker.js）。

// @ts-ignore .open-next/worker.js is produced by `opennext build` and exists at deploy time
import openNextHandler from "./.open-next/worker.js";
import { RateLimiterDO } from "./lib/security/rate-limiter-do";

export { RateLimiterDO };
export default openNextHandler;
