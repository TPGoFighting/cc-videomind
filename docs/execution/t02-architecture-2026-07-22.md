# T02 生产架构与数据所有权证据（2026-07-22）

## 结论

T02 的本地代码、依赖、文档和干净环境验收已完成。生产激活、真实数据库迁移、备份恢复演练、DNS redirect 和线上读写冒烟仍需项目负责人授权；本记录不把本地实现表述为生产已经切换。

## 已落实的唯一权威

- 应用：腾讯云 Next.js + PM2，Nginx 反代 `3100`。
- 数据：`DATABASE_URL` 指向的腾讯 PostgreSQL，`lib/tencent-db.ts` 是唯一连接池和 schema 权威。
- 认证：`app_users` + `app_sessions`；Cookie/Bearer token，数据库只保存 token hash。
- Edge：Cloudflare 仅 DNS、TLS、代理和外围防护，不运行应用 Worker 或 Durable Object。
- 本地媒体：单机自托管 `uploads/`，要求登录、上限 200 MB；不是多实例或对象存储方案。
- 支付：`payment_submissions` + `app_users.subscription_tier`；Stripe 兼容路由固定返回 410。
- 开发例外：SQLite 仅在显式 `LOCAL_MODE=1` 使用，生产禁止双写。

正式理由和回滚见 `docs/decisions/0001-tencent-runtime-and-data-authority.md`。36 个 API 加 1 个历史 auth 入口的完整归属见 `docs/architecture/api-ownership-matrix.md`；矩阵没有未知运行时或数据库。

## 代码迁移

- 把管理员设置、用户/视频管理、词义缓存和 notebook 增量同步迁移到腾讯 PG。
- 补齐 `app_settings`、`user_ai_settings`、`word_definitions`、`video_chunks`、`async_tasks` 与相关索引；所有用户表引用 `app_users`。
- `lib/db/index.ts` 改为唯一腾讯 Pool 的兼容入口，删除第二个 PG Pool。
- 删除 Supabase runtime client、Stripe SDK server、OpenNext/Wrangler/Worker/DO 实现和对应依赖/脚本。
- 旧 OAuth callback 改为固定同源错误跳转；Stripe 两个端点改为明确的 410。
- 上传在鉴权和 ASR 配置成功后才落盘，限制 200 MB，失败清理；媒体流要求登录并严格校验 Range。
- 进程内限流只声明支持单 PM2 实例；多实例之前必须先接入共享计数器。

`lib/supabase/cache*.ts`、`admin.ts`、`quota.ts` 和 `translations.ts` 暂时保留历史路径名，但实现只访问腾讯 PG。扫描未发现 `@supabase/*`、Stripe SDK、OpenNext 或已删除 runtime client 的活动代码导入。

## 文档一致性

以下主文档已统一 canonical、运行时、认证、环境变量、缓存、上传、支付和部署命令：

- `README.md`
- `CLAUDE.md`
- `TEACH_PLAYER_SPEC.md`
- `docs/tencent-cloud-architecture.md`
- `.env.example`

`AUTH_SESSION_SECRET` 从操作说明中删除，因为代码不使用静态 session secret；会话每次登录随机生成。`docs/README.md` 明确把旧 Supabase/Stripe/Vercel/Worker 页面标为历史档案。

## 测试与干净环境

验收时间：2026-07-22 18:28 CST。隔离副本：`/private/tmp/videomind-t02.R928gr`，复制时排除 `.git`、`node_modules`、`.next`、`.env*`、`uploads` 和生成的 TypeScript build info。

首次干净安装暴露了 `lib/utils/http.ts` 直接导入但未声明 `undici` 的隐式传递依赖；将 `undici@^7.24.8` 加为正式 dependency 后从空依赖状态重跑。

最终结果：

| 命令 | 结果 |
| --- | --- |
| `npm ci` | exit 0；473 packages，lockfile 可重建 |
| `npm run lint` | exit 0；0 warning |
| `npm run typecheck` | exit 0 |
| `npm run test` | exit 0；143/143 |
| `npm run build` | exit 0；Next.js 16.2.11，49 个页面/路由入口 |

新增的 `lib/tencent-db.test.ts` 验证生产 repository 所需表全部存在，并验证用户拥有的数据表都绑定 `app_users`。

## 依赖审计

- 删除 Supabase、Stripe、OpenNext 和 Wrangler 后，审计从 T03 时的 14 项下降到 5 项。
- 使用不跨 major 的 lockfile 安全更新后，Babel、js-yaml 和 brace-expansion 告警已清除。
- 最终仍有 2 个 high，均来自 `next -> sharp@0.34.5 -> libvips`。npm 自动修复要求强制把 Next 16 降至 14，属于破坏性方案，因此没有运行 `npm audit fix --force`。
- npm 11 仍提示 4 个 package 的安装脚本需后续建立 allow-scripts 策略；标准 `npm ci` 和生产 build 已成功。

## 公网只读探测

2026-07-22 在不修改生产状态的前提下探测：

- `https://video.tpgofighting.top`：HTTP 200，effective URL 不变，页面身份为 Teach Player。
- `https://teachplayer.tpgofighting.top`：HTTP 200，effective URL 不变，页面身份同为 Teach Player。
- 两个 HTML 内容 hash 不同，且兼容域名没有重定向到 canonical，因此文档只称其为 alias；没有宣称 redirect 已完成。

## 尚未执行的生产项

- 未连接或修改真实腾讯 PostgreSQL；当前环境也没有可用 `psql`/`pg_isready`/Docker 供本地 SQL 恢复演练。
- 未迁移历史 Supabase 用户数据；若确有需保留的数据，必须单开一次性迁移任务，包含数量核对、幂等、回滚和脱敏日志。
- 未执行真实 PostgreSQL + `uploads/` 备份恢复演练。
- 未部署、reload PM2、修改 Nginx/Cloudflare/DNS 或验证线上个人数据写入。
- `/api/tasks/[taskId]`、`/api/worker`、`/api/video-stream` 的细粒度所有权，以及登录/注册限流，已进入矩阵的 T06/T10 安全债务。
