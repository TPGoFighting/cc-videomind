import { NextResponse } from "next/server";
import { checkRateLimitAsync, getClientKey } from "@/lib/security/rate-limit";

/** CSRF protection: checks Origin/Referer against allowed origins */
function validateCsrf(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  try {
    const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
    const url = new URL(origin || "http://localhost");
    const hostname = url.hostname;
    // allow localhost, vercel domains, custom domain
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "tauri.localhost" ||
      url.protocol === "tauri:" ||
      hostname.endsWith(".vercel.app") ||
      hostname === "video.tpgofighting.top" ||
      hostname.endsWith(".tpgofighting.top")
    );
  } catch {
    return false;
  }
}

export interface SecurityConfig {
  allowedMethods?: string[];
  /** 请求体最大字节数（基于 Content-Length）。默认 1MB。 */
  maxBodySize?: number;
  /** 限流配置；不传则不限制（仅做方法/CSRF/body 校验）。 */
  rateLimit?: { maxRequests: number; windowMs: number };
  /** 限流 key 的作用域，避免不同路由互相影响。默认 "api"。 */
  scope?: string;
  /** 跳过 CSRF 校验（如签名验证的 Webhook）。 */
  skipCsrf?: boolean;
  /** 跳过 body 大小校验（如接收文件上传的路由）。 */
  skipBodySize?: boolean;
}

export function withSecurity(config: SecurityConfig = {}) {
  const {
    allowedMethods = ["GET", "POST"],
    maxBodySize = 1024 * 1024,
    rateLimit,
    scope = "api",
    skipCsrf = false,
    skipBodySize = false,
  } = config;

  return {
    async wrap(request: Request, handler: () => Promise<Response>): Promise<Response> {
      // 1. Method check
      if (!allowedMethods.includes(request.method)) {
        return NextResponse.json(
          { error: "Method not allowed" },
          { status: 405, headers: { Allow: allowedMethods.join(", ") } }
        );
      }

      // 2. CSRF
      if (!skipCsrf && !validateCsrf(request)) {
        return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
      }

      // 3. Body size guard (Content-Length header)
      if (!skipBodySize) {
        const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
        if (contentLength > maxBodySize) {
          return NextResponse.json({ error: "Request body too large" }, { status: 413 });
        }
      }

      // 4. Rate limit（生产走 Durable Object，本地回退内存）
      if (rateLimit) {
        const key = getClientKey(request, scope);
        const result = await checkRateLimitAsync(key, rateLimit.maxRequests, rateLimit.windowMs);
        if (!result.allowed) {
          return NextResponse.json(
            { error: "Too many requests" },
            {
              status: 429,
              headers: {
                "Retry-After": "60",
                "X-RateLimit-Reset": String(result.resetAt ?? 0),
              },
            }
          );
        }
      }

      // 5. Execute handler
      return handler();
    },
  };
}
