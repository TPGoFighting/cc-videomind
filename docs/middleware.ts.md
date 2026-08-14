# middleware.ts

## 文件路径
`middleware.ts`

## 功能摘要
Next.js 中间件，处理 Supabase 认证会话刷新。

## 关键实现细节
1. 创建 Supabase 服务端客户端
2. 刷新用户会话（若已过期则 user 变为 null）
3. 匹配所有非静态资源路由

## 依赖关系
- `@supabase/ssr` - createServerClient
- `next/server` - NextResponse, NextRequest

## 关联的功能模块
- 用户认证系统