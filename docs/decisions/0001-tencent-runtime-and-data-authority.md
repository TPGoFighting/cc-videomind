# ADR-0001：腾讯云 PM2 + PostgreSQL 作为唯一生产权威

- 状态：Accepted
- 日期：2026-07-22
- 决策：D1（用户已确认）
- 代码实施目标：2026-07-22
- 生产激活目标：下一次经项目负责人授权的 ToC Beta 发布
- 决策负责人：项目负责人
- 实施负责人：应用维护者；Codex 负责本地代码、文档和验证，不擅自部署

## 背景

仓库曾同时保留腾讯云 PM2、Cloudflare Workers、Supabase、腾讯 PostgreSQL 和本地 SQLite 路径。名称相同的缓存、认证、设置和用户学习数据可能落入不同数据库；Cloudflare Worker 又无法可靠使用进程本地 `uploads/`。这会导致线上行为取决于部署命令和环境变量，而不是产品合同。

2026-07-22 的公网只读探测显示 `https://video.tpgofighting.top` 与 `https://teachplayer.tpgofighting.top` 均返回 Teach Player 首页。代码将前者定义为 canonical 产品入口，后者暂作兼容别名；DNS 重定向和 canonical SEO 在获得生产授权后实施。

## 决策

1. 唯一应用运行时是腾讯云主机上的 Next.js Node.js 服务，由 PM2 管理，Nginx 转发。
2. 唯一生产数据库是 `DATABASE_URL` 指向的腾讯 PostgreSQL `teachplayer` 数据库。
3. 唯一认证是 `app_users` + `app_sessions`，浏览器使用 HttpOnly Cookie，Android 使用相同 Session 的 Bearer token。
4. Cloudflare 只承担 DNS、TLS、代理、静态缓存和边缘防护；仓库不再提供把完整 Next.js 应用部署到 Workers 的命令。
5. `LOCAL_MODE=1` 的 SQLite 只用于单机开发/演示，不参与生产同步，也不是生产数据副本。
6. 本地视频上传只在自托管 Node.js 运行时支持：要求登录、单文件最大 200MB、写入 `<release>/uploads/`，失败立即清理。`uploads/` 必须作为持久目录挂载或在发布切换时保留，不能放进一次性候选目录。
7. D3 已选择微信/支付宝付款后人工审核。`payment_submissions` 与 `app_users.subscription_tier` 是付费权威；Stripe checkout/webhook 兼容端点返回 410，不再写第二套订阅状态。

## 数据所有权

| 领域 | 权威表/存储 | 生产写入者 | 读取者 |
| --- | --- | --- | --- |
| 账户与会话 | `app_users`、`app_sessions` | 注册、登录、退出、管理员审核 | `/api/me`、所有鉴权路由 |
| 视频共享缓存 | `video_analyses` | transcript/analyze/upload | 视频工作区、历史、管理后台 |
| AI 派生缓存 | `ai_results_cache` | analyze/moments/summary | 相同生成路由 |
| 翻译版本 | `video_translations` | translate-transcript | translations |
| AI/用户设置 | `app_settings`、`user_ai_settings` | 管理设置 | AI Provider 工厂 |
| 词义共享缓存 | `word_definitions` | word-definitions | 单词卡片 |
| 用户学习数据 | `user_videos`、`user_notes`、`user_vocabulary`、`user_quotes` | 对应用户 API | 对应列表/复习 API |
| 复习与打卡 | `user_word_reviews`、`user_checkins` | review/checkin/sync | review/checkin/sync |
| 付款与权益 | `payment_submissions`、`app_users.subscription_tier` | 用户提交、管理员审核 | 设置页、鉴权资料 |
| 异步任务/RAG | `async_tasks`、`video_chunks` | worker/vectorizer | task status/chat |
| 上传媒体 | 持久 `uploads/` 目录 | 已登录 upload 路由 | 已登录 video-stream 路由 |

第三方 AI、YouTube、Bilibili、Supadata 和 ASR 是外部数据来源，不是用户账户或学习记录的权威存储。

## 迁移边界

- 已迁移：管理配置、管理员用户/视频、词义缓存、手机离线同步均直接使用腾讯 PostgreSQL。
- 已禁用：Supabase OAuth callback、Stripe checkout/webhook；旧客户端获得明确的兼容错误/登录页跳转。
- 已退役：`@supabase/*`、`stripe`、`@opennextjs/cloudflare`、`wrangler` 运行时依赖与完整应用 Worker 配置。
- 仅保留为档案：`supabase/migrations/`、`docs/supabase/` 和旧 Cloudflare 文档，不得作为生产操作说明。
- 暂保留旧命名：`lib/supabase/cache*.ts`、`quota.ts`、`translations.ts` 的实现已使用腾讯 PostgreSQL；后续可机械重命名，但不得据目录名恢复 Supabase 客户端。

## 回滚

代码回滚基线为 T02 前提交 `6bdc93d`。数据库变更全部为 `CREATE TABLE IF NOT EXISTS`、`CREATE INDEX IF NOT EXISTS` 或 `ADD COLUMN IF NOT EXISTS`，回滚应用时不删除新表、不丢弃数据。

生产发布必须：

1. 先备份 PostgreSQL 和当前 `uploads/`。
2. 在隔离候选目录执行安装、门禁和构建。
3. 验证 `.next/BUILD_ID` 后原子切换，并保留上一版本目录。
4. 若健康检查或读写冒烟失败，立即切回上一目录和 PM2 版本；数据库只做向前兼容，不执行自动 DROP。

## 后果

- 优点：认证、缓存、学习记录和付费权益只有一个可审计来源；本地上传与 Node.js 文件系统能力一致。
- 代价：当前应用内限流只适用于单 PM2 实例；扩展多实例前必须接入共享限流存储，并验证 sticky/session 无关。
- 代价：历史 Supabase 数据不会自动出现于腾讯数据库；若仍有需保留的真实用户数据，必须另立一次性、可核对、可回滚的数据迁移任务。
- 非结论：本 ADR 与本地代码通过不代表生产已经切换或备份恢复已经演练。
