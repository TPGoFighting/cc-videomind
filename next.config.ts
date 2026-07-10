import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;

// 仅在非 Vercel 且非 LOCAL_MODE 环境下加载 Cloudflare 开发工具。
// 本地单机工具（LOCAL_MODE=1）不需要 Cloudflare Workers 适配层，默认跳过以免拖慢 next dev。
if (!process.env.VERCEL && process.env.LOCAL_MODE !== "1" && process.env.ENABLE_CLOUDFLARE_DEV === "1") {
  import("@opennextjs/cloudflare").then((m) =>
    m.initOpenNextCloudflareForDev()
  );
}
