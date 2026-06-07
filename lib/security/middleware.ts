import { NextResponse } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/security/rate-limit";

/** CSRF protection: checks Origin/Referer against allowed origins */
function validateCsrf(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  try {
    const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
    const url = new URL(origin || "http://localhost");
    const hostname = url.hostname;
    // allow localhost, vercel domains, custom domain
    return hostname === "localhost" || hostname.endsWith(".vercel.app") || hostname === "video.tpgofighting.top" || hostname.endsWith(".tpgofighting.top");
  } catch { return false; }
}

interface SecurityConfig {
  allowedMethods?: string[];
  maxBodySize?: number;
  rateLimit?: { maxRequests: number; windowMs: number };
  skipCsrf?: boolean;
}

export function withSecurity(config: SecurityConfig = {}) {
  const { allowedMethods = ["GET", "POST"], maxBodySize = 1024 * 1024, rateLimit, skipCsrf = false } = config;

  return {
    async wrap(request: Request, handler: () => Promise<Response>): Promise<Response> {
      // 1. Method check
      if (!allowedMethods.includes(request.method)) {
        return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: allowedMethods.join(", ") } });
      }

      // 2. CSRF
      if (!skipCsrf && !validateCsrf(request)) {
        return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
      }

      // 3. Body size guard (Content-Length header)
      const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
      if (contentLength > maxBodySize) {
        return NextResponse.json({ error: "Request body too large" }, { status: 413 });
      }

      // 4. Rate limit
      if (rateLimit) {
        const key = getClientKey(request, "api");
        const result = checkRateLimit(key, rateLimit.maxRequests, rateLimit.windowMs);
        if (!result.allowed) {
          return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
        }
      }

      // 5. Execute handler
      return handler();
    }
  };
}
