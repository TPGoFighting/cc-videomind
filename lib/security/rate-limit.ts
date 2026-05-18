/*
 * 速率限制器（内存实现）
 *
 * TODO(prod): 生产环境迁移到 Upstash Redis
 *   当前内存实现的问题：
 *   1. 服务重启后计数器丢失
 *   2. 多实例（Vercel 边缘函数）各自独立计数，无法共享状态
 *   3. Map 在极端流量下可能内存膨胀（已有定期清理逻辑缓解）
 *   Upstash Redis 兼容 Vercel Edge，迁移成本低：@upstash/redis + @upstash/ratelimit
 *
 *   免费额度: Upstash Redis 每天 10,000 条，MVP 阶段够用。
 */

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

export function checkRateLimit(key: string, limit: number, windowMs: number) {
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

/*
 * 从请求头提取客户端标识。
 *
 * 注意：x-forwarded-for 可被客户端伪造。
 * 生产环境必须确保反向代理（Vercel/Cloudflare）覆盖此 header，
 * 或使用平台提供的真实 IP（如 Vercel 的 request.headers.get("x-vercel-forwarded-for")）。
 */
export function getClientKey(request: Request, scope: string) {
  // Vercel 提供的真实客户端 IP（优先级最高）
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return `${scope}:${vercelIp}`;
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded || realIp || "local";

  // 基本校验：拒绝明显无效的 IP 格式
  if (ip.length > 45 || ip.includes("<") || ip.includes(">")) {
    return `${scope}:invalid`;
  }

  return `${scope}:${ip}`;
}
