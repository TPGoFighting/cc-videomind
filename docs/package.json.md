# package.json

## 文件路径
`package.json`

## 功能摘要
项目依赖和脚本配置。

## 关键实现细节
1. 脚本命令：
   - dev: 本地开发服务器
   - build: 生产构建
   - lint: ESLint 检查
   - typecheck: TypeScript 类型检查
   - test: 运行测试
   - preview/deploy/upload: Cloudflare Workers 操作

2. 核心依赖：
   - Next.js 16 + React 19
   - Tailwind CSS + shadcn/ui
   - Supabase (SSR + JS)
   - GSAP (动画)
   - Three.js (3D)
   - Zod (验证)
   - Stripe (支付)

3. 开发依赖：
   - @opennextjs/cloudflare (Cloudflare 部署)
   - TypeScript 5.7

## 依赖关系
- 无外部依赖

## 关联的功能模块
- 项目构建和部署