/*
 * 速率限制器
 *
 * D1 生产运行时是单实例 PM2。应用内使用进程固定窗口计数，外层 Cloudflare/Nginx
 * 负责边缘防护。若未来扩展为多 PM2 实例，必须先迁移到共享限流存储。
 *
 * 公共签名保持向后兼容（现有直接调用点仍可工作）：
 *   checkRateLimit(key, limit, windowMs)        -> { allowed, remaining, resetAt? }   (同步, 内存兜底)
 *   getClientKey(request, scope)                -> string
 * checkRateLimitAsync(...) 保留异步签名，供 withSecurity 使用。
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
}

// ───────────────────────── 内存实现（本地 dev / 兜底 / 向后兼容） ─────────────────────────

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let cleanupCounter = 0;

/** 定期清理过期 bucket，防止内存泄漏 */
function cleanExpiredBuckets(now: number) {
  cleanupCounter += 1;
  // 每 ~200 次请求清理一次，或在 bucket 数量超过 2000 时强制清理
  if (cleanupCounter < 200 && buckets.size < 2000) {
    return;
  }
  cleanupCounter = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * 内存版限流（同步）。
 * 用于：本地开发、以及 Durable Object 不可用时的兜底。
 * 保留此签名以满足向后兼容——仍可能有路由直接调用 checkRateLimit。
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  cleanExpiredBuckets(now);
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

/** 异步兼容入口；D1 单实例 PM2 与同步实现共享同一 bucket。 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  return checkRateLimit(key, limit, windowMs);
}

// ───────────────────────── 客户端标识（B3：优先平台真实 IP） ─────────────────────────

/**
 * 从请求头提取限流 key 的「身份」部分。
 *
 * 优先级（只信任平台注入的真实客户端 IP 头）：
 *   1. cf-connecting-ip   —— Cloudflare 注入，最可靠，不可被客户端伪造
 *   2. x-vercel-forwarded-for —— Vercel 注入
 *   3. x-real-ip          —— 受信任反代注入
 *
 * 若以上平台真实 IP 头都不存在（本地 dev、或请求未经过可信平台）：
 *   不信任 x-forwarded-for（客户端可伪造），降级为统一的共享 key `untrusted`，
 *   使攻击者无法通过伪造 IP 头绕过限流。此时整条路由共享一个 bucket。
 *
 * scope 用于区分不同路由，避免互相影响计数。
 */
export function getClientKey(request: Request, scope: string): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) {
    return `${scope}:${cfIp.trim()}`;
  }

  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return `${scope}:${vercelIp.split(",")[0]?.trim()}`;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return `${scope}:${realIp.trim()}`;
  }

  // 无平台真实 IP：宁可降级为统一共享 key，也不使用可伪造的 x-forwarded-for
  return `${scope}:untrusted`;
}
