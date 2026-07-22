# 腾讯云唯一生产架构与运行手册

Teach Player 的唯一生产运行时是腾讯云主机上的 Next.js + PM2，唯一生产数据权威是腾讯 PostgreSQL。Cloudflare 只承担 DNS、TLS、代理与边缘防护；不运行 Next.js Worker、Durable Object、数据库、上传文件或后台任务。

正式决策见 [`decisions/0001-tencent-runtime-and-data-authority.md`](decisions/0001-tencent-runtime-and-data-authority.md)，全部接口归属见 [`architecture/api-ownership-matrix.md`](architecture/api-ownership-matrix.md)。

## 流量与责任边界

```text
video.tpgofighting.top (canonical)
teachplayer.tpgofighting.top (compatibility alias, redirect pending)
            |
Cloudflare: DNS / TLS / proxy / coarse edge protection
            |
Tencent Nginx: host routing / body limit / reverse proxy
            |
Next.js 16 + PM2: all pages, APIs, auth, AI orchestration
       |                         |
Tencent PostgreSQL          external AI/transcript/ASR providers
       |
single-host uploads/ (media bytes are on filesystem, metadata in PG)
```

- Nginx 只把应用流量转发到 `127.0.0.1:3100`。
- 当前 rate limiter 是进程内实现，只支持单 PM2 应用实例。多实例前必须接入共享限流器，并重新验收昂贵接口和登录攻击防护。
- 不允许在 Cloudflare Worker、Supabase 或第二个 PostgreSQL Pool 增加生产写入。

## 环境变量

复制仓库根目录 [`.env.example`](../.env.example)。生产最小集合：

```env
NEXT_PUBLIC_APP_URL=https://video.tpgofighting.top
DATABASE_URL=postgresql://teachplayer_app:<password>@127.0.0.1:5432/teachplayer
AI_PROVIDER=openai-compatible
AI_API_BASE_URL=https://api.example.com/v1
AI_API_KEY=<server-only-key>
AI_MODEL=<provider-model>
```

按启用能力配置：

```env
AI_FALLBACK_MODELS=
TRANSCRIPT_PROVIDER=youtube
SUPADATA_API_KEY=
TRANSCRIPT_FALLBACK_URL=
ADMIN_EMAIL=owner@example.com
ASYNC_TASK_WORKER_SECRET=<independent-long-random-value>
ACCOUNT_DELETION_WORKER_SECRET=<independent-long-random-value>
ASR_API_BASE_URL=https://api.siliconflow.cn/v1
ASR_API_KEY=
ASR_MODEL=FunAudioLLM/SenseVoiceSmall
```

- 所有 secret 只保存在服务器环境或密钥管理系统，不提交 Git。
- 不需要 `AUTH_SESSION_SECRET`：登录时生成 48-byte 随机 token，客户端保存原 token，PostgreSQL 只保存 SHA-256 哈希。
- 生产禁止设置 `LOCAL_MODE=1` 或 `NEXT_PUBLIC_LOCAL_MODE=1`。
- `NEXT_PUBLIC_APP_URL` 必须等于 canonical HTTPS 地址，否则上传媒体 URL 和 SEO 地址可能分叉。
- `ASYNC_TASK_WORKER_SECRET` 与 `ACCOUNT_DELETION_WORKER_SECRET` 必须独立生成并只放在服务端；任一缺失时对应内部 Worker 拒绝执行。

## 数据库与认证

数据库使用独立 `teachplayer` database 和最小权限 `teachplayer_app` 账号。可以与同主机其他数据库共用 PostgreSQL 实例，但不共用 schema、表或账号。

`lib/tencent-db.ts` 是唯一生产连接池，首次查询会幂等执行仅向前兼容的 schema 语句。当前权威表：

| 领域 | 表 |
| --- | --- |
| 账户与 Session | `app_users`, `app_sessions` |
| 设置与付费 | `app_settings`, `user_ai_settings`, `payment_submissions` |
| 隐私与账户权利 | `user_privacy_preferences`, `account_deletion_requests` |
| 产品观测与管理审计 | `product_events`, `admin_audit_events` |
| 视频与 AI 共享数据 | `video_analyses`, `ai_results_cache`, `video_translations`, `video_chunks`, `word_definitions`, `async_tasks` |
| 个人学习数据 | `user_videos`, `user_notes`, `user_vocabulary`, `user_quotes`, `user_word_reviews`, `user_checkins` |

认证规则：

- 注册密码使用 Node.js `scrypt` + 16-byte 随机盐。
- Session token 使用 48-byte 随机值；浏览器通过 `HttpOnly`、`SameSite=Lax` Cookie 传递，生产启用 `Secure`，移动端可用 Bearer token。
- 会话默认 30 天，退出会删除服务端 hash。
- 个人数据 SQL 必须从 session 取得用户并显式带 `user_id`；不依赖前端 user ID，也不依赖 Supabase RLS。
- 邮箱验证、找回密码和 OAuth 当前未实现。旧 `/auth/callback` 只会同源返回登录错误页。

## 隐私维护与账户删除 Worker

- 产品分析默认关闭；只有 `user_privacy_preferences.analytics_enabled = TRUE` 的登录用户才会写入 `product_events`。
- 事件 payload 在应用层按事件名使用严格 Zod 白名单，禁止 URL、字幕、Prompt、回答和笔记正文；产品事件保留 180 天，管理员审计保留 365 天。
- 账户删除请求验证当前密码后进入 7 天撤销期。到期 Worker 删除会话、个人配置、历史、笔记、词句、复习、打卡与待处理任务，并把付款引用最小化为不可逆摘要；管理员账户需要先移交权限。
- 运维应每天以 `Authorization: Bearer <ACCOUNT_DELETION_WORKER_SECRET>` 调用一次 `POST /api/internal/account-deletions`。响应只含完成/失败和到期清理数量，不含用户身份或内容。
- Worker 上线、定时器配置和首次生产执行属于部署变更，必须在数据库备份后由发布负责人授权；本仓库的代码与 schema 不等同于生产任务已激活。

历史目录 `lib/supabase/` 只保留模块名，里面的缓存、设置、配额和翻译实现均以腾讯 PostgreSQL 为后端。新代码直接依赖 `lib/tencent-db.ts`；不得新增 Supabase SDK。

## 本地上传支持边界

本轮选择“单机自托管文件系统”，不是对象存储：

- 只有登录用户可以上传和读取；单文件最大 200 MB。
- 文件保存在应用主机持久 `uploads/` 目录，数据库保存对应随机 video ID 的分析结果。
- 发布候选目录必须复用同一个持久目录；不可随 release 清理或覆盖。
- 失败上传会删除临时文件；Range 请求会校验并对非法范围返回 416。
- 当前 video ID 是不可猜 capability，但还没有独立的上传所有权表。若产品要支持分享、多主机、CDN 直传或对象存储，必须先建立 owner/access schema、迁移与删除策略。

## 发布流程

下列步骤定义生产责任边界，不授权 Codex 自动执行生产发布：

1. 记录待发布 commit、当前生产 commit、Node/PM2 版本和负责人。
2. 创建 PostgreSQL 逻辑备份，并保存 `uploads/` 快照或可恢复副本。
3. 在独立候选目录使用 Node.js 22 执行：

   ```bash
   npm ci
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

4. 确认 `.next/BUILD_ID` 属于待发布 commit；核对 `.env.local` 的 canonical、数据库和 provider 配置，不输出值。
5. 让 PM2 使用 `npm start` 在 `3100` 启动候选版本，先从本机/Nginx 内侧探活，再原子 reload/switch。
6. 通过 canonical 公网域名验证页面身份、注册、登录、`/api/me`、视频解析、笔记增删、单词/句子收藏、复习/打卡和上传权限。
7. Cloudflare/Nginx 变更需单独授权；兼容域名在配置 301/308 前继续标记为 alias，不宣称已重定向。

## 备份与恢复

每天至少一份 PostgreSQL custom-format 备份，并将数据库和上传快照同步到腾讯 COS 或另一台主机。示例由运维负责人替换显式容器名和受控目标路径：

```bash
docker exec <postgres-container> pg_dump -Fc -U teachplayer_app -d teachplayer \
  > /var/backups/teachplayer-YYYY-MM-DD.dump
```

备份不是成功条件，恢复演练才是。至少每个发布周期在隔离 PostgreSQL 实例执行：

```bash
createdb teachplayer_restore_check
pg_restore --exit-on-error --no-owner --dbname=teachplayer_restore_check \
  /var/backups/teachplayer-YYYY-MM-DD.dump
```

恢复验收：

- 所有权威表存在，表数量与备份清单相符。
- 随机抽样的用户、会话、视频缓存和学习记录引用完整；不得导出真实值到日志。
- 候选应用用隔离连接串完成登录、`/api/me` 和一项个人数据读写后清理测试环境。
- 上传目录另行恢复并抽查媒体 ID；数据库恢复不能替代文件恢复。

当前仓库只完成代码/schema 和恢复流程定义，尚未取得生产数据库授权，也没有执行真实生产备份恢复演练。

## 回滚

- T02 前代码基线：`6bdc93d`。
- schema 只使用 `CREATE ... IF NOT EXISTS`、索引创建和 `ADD COLUMN IF NOT EXISTS`；应用回滚不得 DROP 新表或删除数据。
- 若公网健康检查或核心读写失败，切回上一个 release/PM2 版本，恢复原环境文件引用，复验 canonical 页面身份与核心读写。
- 只有确认数据被破坏且项目负责人批准时才执行数据库恢复；先保留故障现场与增量数据。

## Supabase、Stripe 与 Cloudflare 退役边界

- Supabase SDK 和 runtime client 已删除；`supabase/migrations/`、旧文档只作为历史档案，不是发布输入。
- Stripe SDK 已删除；checkout/webhook 兼容路由固定返回 410。人工付款的唯一状态在 `payment_submissions` 与 `app_users.subscription_tier`。
- OpenNext/Wrangler/Worker 配置和部署脚本已删除。Cloudflare 配置只能在控制台或独立基础设施仓库管理 DNS、TLS、代理和外围规则。
