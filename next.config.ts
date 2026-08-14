import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sql.js initializes an Emscripten CommonJS module at runtime. Bundling it into
  // the Next server chunk breaks its internal `module.exports` hand-off.
  serverExternalPackages: ["sql.js"],
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
