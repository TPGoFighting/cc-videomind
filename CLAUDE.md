# CLAUDE.md

This file provides repository guidance for coding agents working on Teach Player.

## Product

Teach Player (VideoMind) 是面向中文英语学习者的 YouTube AI 学习工作区。用户粘贴知识型 YouTube 链接后获得可回到字幕和时间点核验的双语材料，并通过收藏与复习形成学习闭环。

- 生产 canonical：`https://video.tpgofighting.top`
- `https://teachplayer.tpgofighting.top`：兼容域名；完成显式重定向前不要把它写成 canonical
- 唯一生产运行时：腾讯云 Next.js + PM2 + PostgreSQL
- Cloudflare：只负责 DNS、TLS、代理和边缘防护，不运行 Next.js、数据库、上传或后台任务

架构决策见 `docs/decisions/0001-tencent-runtime-and-data-authority.md`，全部接口归属见 `docs/architecture/api-ownership-matrix.md`。

## Commands

```bash
npm ci                 # 按 lockfile 安装
npm run dev            # Next.js 本地开发（webpack）
npm run lint           # ESLint，warning 也会失败
npm run typecheck      # TypeScript strict 检查
npm run test           # Node + tsx 测试，不访问生产服务
npm run build          # Next.js 生产构建（webpack）
npm start              # 在 3100 端口启动已构建产物
```

仓库不提供 Cloudflare Worker、Vercel 或 Stripe 部署命令。生产发布必须走腾讯云主机上的 PM2/Nginx 流程，并先执行完整质量门禁。

## Architecture

### Request and data flow

1. 首页 `/` 粘贴 YouTube URL，`POST /api/video-info` 解析元数据，再进入 `/video/[videoId]`。
2. 字幕、分析、摘要、关键时刻和翻译复用腾讯 PostgreSQL 的共享缓存；缓存模块位于历史目录 `lib/supabase/`，但实现不得连接 Supabase。
3. 笔记、词汇、句子、复习、打卡、历史、设置和付款审核全部以腾讯 PostgreSQL 为唯一权威。
4. `lib/tencent-auth.ts` 提供邮箱密码认证与 Cookie/Bearer Session；密码使用 scrypt + 随机盐，会话只保存 SHA-256 token hash。
5. 本地视频上传仅支持腾讯云单机自托管：文件写入进程主机 `uploads/`，读取接口要求登录。不得把该目录视为多实例或 Cloudflare 存储。
6. `LOCAL_MODE=1` 可在开发环境使用 SQLite；生产不得启用，也不得与 PostgreSQL 双写。

### Directory map

```text
app/                          Next.js App Router 页面与 API
  api/                        36 个 route.ts；生产都运行在腾讯云 Next.js
  video/[videoId]/            视频学习工作区
  review/                     SM-2 复习
  history|vocabulary|quotes|notes/
lib/
  ai/                         Provider、配置解析与 prompts
  youtube/                    YouTube 元数据与字幕回退链
  tencent-db.ts               唯一生产连接池与幂等 schema
  tencent-auth.ts             自托管认证和 session
  supabase/                   仅保留历史模块名；运行时实现必须是腾讯 PostgreSQL
  db/                         LOCAL_MODE 的 SQLite 适配和 PG 兼容入口
  security/                   CSRF、body size、单实例内存限流
components/                   页面与业务组件
docs/                         ADR、架构、运维与执行证据
```

### Key patterns

**Provider/Adapter**

- `AiProvider` → OpenAI-compatible / Gemini；配置优先级为用户设置 > 全局设置 > 环境变量。
- `TranscriptProvider` → YouTube 内部多级回退；可选 Supadata 或同一受控生产栈的远程回退。

**Server-side authority**

- 生产数据访问统一使用 `queryTencent()` / `withTencentTransaction()`。
- `getAuthenticatedUserId(request)` 是保留兼容名，实际读取腾讯会话。
- 不信任 client-provided `userId`；个人数据 SQL 必须显式按会话用户过滤。
- 新代码不得引入 Supabase SDK、Stripe SDK、Cloudflare Worker 数据存储或第二个 PostgreSQL Pool。

**API security**

- 写接口使用 `withSecurity()` 统一执行 method、CSRF、body size 和 rate limit 检查。
- 当前限流只适用于单 PM2 进程；多实例扩容前必须先接入共享限流器。Cloudflare/Nginx 仍需提供外围防滥用。
- 任务查询和本地视频流目前是已认证/不可猜 ID 的 capability 模型；扩大共享范围前必须增加资源所有权校验。
- AI 输出必须经过 Zod schema 与既有修复逻辑验证。

**Payment boundary**

- D3 首发只使用站内人工付款提交与管理员审核。
- `/api/stripe/create-checkout-session` 和 `/api/webhooks/stripe` 固定返回 `410 payment_method_disabled`。
- 不得在国内支付能力真正接入前恢复 Stripe 文案或环境变量。

## Environment

复制 `.env.example`，不要提交真实值。生产至少需要 `NEXT_PUBLIC_APP_URL`、`DATABASE_URL` 和一套有效 AI Provider 配置；按启用能力配置字幕或 ASR 密钥。管理员邮箱由 `ADMIN_EMAIL` 控制。

`DATABASE_URL`、AI/ASR key、Cookie、Bearer token、用户文本和完整上传路径不得写入日志、文档、测试 fixture 或 Git。

## Quality and deployment rules

变更提交前依次运行：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

- 不得用关闭规则、跳过测试、`ignoreBuildErrors` 或临时下载依赖来伪造通过。
- 构建成功不等于生产验证；线上结论必须包含目标 URL、HTTP/页面身份、时间和实际交互证据。
- 不自动执行生产数据库迁移、密钥轮换、DNS 变更或部署。
- 工作区可能包含用户未提交的设计实验；只暂存当前任务明确拥有的文件。

## Reference docs

- `CODEX_EXECUTION_TODO.md` — 已确认的顺序执行清单
- `TEACH_PLAYER_SPEC.md` — 当前产品功能与边界
- `docs/tencent-cloud-architecture.md` — 自托管部署、数据和恢复规则
- `docs/architecture/api-ownership-matrix.md` — 路由运行时、数据、认证、缓存归属
- `docs/operations/secret-rotation.md` — 凭证轮换手册
- `DESIGN.md` — 设计基线；正在进行的 Taste 页面实验仍需实际浏览器验收
