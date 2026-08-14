# next.config.ts

## 文件路径
`next.config.ts`

## 功能摘要
Next.js 配置文件。

## 关键实现细节
1. 安全 Headers：
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: SAMEORIGIN
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy: 禁用摄像头、麦克风、地理位置

2. Cloudflare 开发工具初始化（非 Vercel 环境）

## 依赖关系
- next - NextConfig 类型
- @opennextjs/cloudflare - 开发工具

## 关联的功能模块
- Next.js 应用配置