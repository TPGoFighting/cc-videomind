// lib/security/rate-limiter-do.ts
//
// Cloudflare Durable Object：实现跨 Worker 实例共享的固定窗口计数器。
//
// 部署方式（见 REVIEW-FINDINGS.md 分区 B / wrangler.jsonc）：
//   - wrangler.jsonc 声明 durable_objects 绑定 (RATE_LIMITER) 与 migrations；
//   - 在自定义 worker 入口 (worker.ts) 中 export 本类，使 RATE_LIMITER 绑定能找到类。
//
// 每个 key 对应一个 DO 实例（ns.idFromName(key)），实例的 storage 保存当前窗口计数，
// 因此所有 Worker 实例共享同一份计数（内存 Map 在 Workers 上做不到这一点）。

import { DurableObject } from "cloudflare:workers";
import type { DurableObjectState } from "@cloudflare/workers-types";

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiterDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const limit = Number(url.searchParams.get("limit"));
    const windowMs = Number(url.searchParams.get("window"));

    if (
      !key ||
      !Number.isFinite(limit) ||
      !Number.isFinite(windowMs) ||
      limit <= 0 ||
      windowMs <= 0
    ) {
      return new Response("Invalid rate-limit parameters", { status: 400 });
    }

    const now = Date.now();
    const bucket = (await this.ctx.storage.get<Bucket>(key)) ?? null;

    // 窗口已过期或不存在 -> 开新窗口，计为第 1 次
    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      await this.ctx.storage.put(key, { count: 1, resetAt });
      return Response.json({ allowed: true, remaining: limit - 1, resetAt });
    }

    // 已达上限 -> 拒绝
    if (bucket.count >= limit) {
      return Response.json({ allowed: false, remaining: 0, resetAt: bucket.resetAt });
    }

    // 计数 +1
    const next = bucket.count + 1;
    await this.ctx.storage.put(key, { count: next, resetAt: bucket.resetAt });
    return Response.json({ allowed: true, remaining: limit - next, resetAt: bucket.resetAt });
  }
}
