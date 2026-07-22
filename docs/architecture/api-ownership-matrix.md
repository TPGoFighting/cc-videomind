# API 运行时与数据归属矩阵

> 审计日期：2026-07-22
> 覆盖范围：全部 41 个 `app/api/**/route.ts`，另含 1 个历史 `/auth/callback` 入口。

## 全局不变量

- 表中所有生产路由都运行在腾讯云 Next.js Node.js + PM2；没有 Vercel Function 或 Cloudflare Worker 路由。
- 表中所有 PostgreSQL 表都由 `lib/tencent-db.ts` 的唯一 Pool 访问。历史名称 `lib/supabase/*` 只是尚未机械重命名的腾讯 PG 适配模块。
- Cloudflare 只负责 DNS、TLS、代理和外围防护，不拥有应用数据或缓存。
- `LOCAL_MODE=1` 时，部分学习/缓存接口可改用 SQLite；这只属于开发模式，生产必须关闭且不得双写。
- “可选账户”表示匿名用户可取得首次价值，已登录用户才写入 `user_videos` 或使用个人 AI 设置。
- 个人数据始终从 Cookie/Bearer Session 解析用户；数据库查询不得接受前端传入的 `user_id` 作为权威。

## 路由矩阵

| Route / method | 生产运行时 | 权威数据 / 外部依赖 | 鉴权与资源边界 | 缓存 / 写入规则 |
| --- | --- | --- | --- | --- |
| `/api/account/deletion-request` GET, POST, DELETE | 腾讯 Next.js | PG `account_deletion_requests`, `app_users` | 必须登录；POST 还需当前密码和精确确认短语；管理员需先移交权限 | 创建 7 天撤销期请求；DELETE 仅撤销尚未到期的 pending 请求 |
| `/api/account/export` GET | 腾讯 Next.js | PG 本人账户、学习、付款状态、隐私偏好与删除请求 | 必须登录且只导出本人；每小时 3 次 | `private, no-store` JSON；排除密码、session、个人 AI Key 和付款凭证正文 |
| `/api/admin/metrics` GET | 腾讯 Next.js | PG `product_events` | 仅 `admin` session | 只读 7–180 天聚合；访问写入不含正文的管理员审计 |
| `/api/admin/payments` GET, PUT | 腾讯 Next.js | PG `payment_submissions`, `app_users` | 仅 `admin` session | 审核批准更新唯一订阅权威；无第二支付状态 |
| `/api/admin/settings` GET, PUT | 腾讯 Next.js | PG `app_settings`, `user_ai_settings`, `app_users` | GET 需登录并按角色脱敏；PUT 仅 admin | 写后清空进程内 AI provider 配置缓存 |
| `/api/admin/settings/test` POST | 腾讯 Next.js | 请求内临时 AI 配置 + 外部 AI provider | 仅 admin | 不写数据库；只做受限 provider 探测 |
| `/api/admin/users` GET | 腾讯 Next.js | PG `app_users` | 仅 admin | 无缓存 |
| `/api/admin/videos` GET | 腾讯 Next.js | PG `video_analyses`, `user_videos`, `app_users` | 仅 admin | 聚合查询，不写入 |
| `/api/analyze` POST | 腾讯 Next.js | PG `video_analyses`, `ai_results_cache`, `user_videos`; 外部 AI | 可选账户 | 优先共享完整分析/综合缓存；single-flight 后再写 PG |
| `/api/auth/change-password` POST | 腾讯 Next.js | PG `app_users` | 必须登录且验证当前密码 | scrypt 新盐替换密码 hash |
| `/api/auth/login` POST | 腾讯 Next.js | PG `app_users`, `app_sessions` | 匿名凭证入口 | 新建随机 session；当前需在 T06 增强登录级限流 |
| `/api/auth/logout` POST | 腾讯 Next.js | PG `app_sessions` | 当前 session（无 session 也可幂等退出） | 删除 token hash 并清 Cookie |
| `/api/auth/register` POST | 腾讯 Next.js | PG `app_users`, `app_sessions` | 匿名凭证入口 | 创建用户和 session；当前需在 T06 增强注册级限流 |
| `/api/bilibili-parse-stream` GET | 腾讯 Next.js | PG `video_analyses`; 外部 Bilibili/ASR | 公开、接口限流 | 成功字幕写共享视频缓存；SSE 不缓存响应 |
| `/api/chat` POST | 腾讯 Next.js | PG `video_analyses`, `video_chunks`; 外部 AI/字幕 | 可选账户 | 读取共享字幕/RAG；缺字幕时回填 `video_analyses` |
| `/api/checkin` GET, POST | 腾讯 Next.js | PG `user_checkins` | 必须登录 | 按 `(user_id, checkin_date)` upsert |
| `/api/generate-moments` POST | 腾讯 Next.js | PG `video_analyses`, `ai_results_cache`; 外部 AI | 可选账户 | 综合缓存 → moments 缓存 → 生成后写共享缓存 |
| `/api/generate-summary` POST | 腾讯 Next.js | PG `video_analyses`, `ai_results_cache`; 外部 AI | 可选账户 | 综合缓存 → summary 缓存 → 生成后写共享缓存 |
| `/api/history` GET | 腾讯 Next.js | PG `user_videos`, `video_analyses` | 未登录返回空列表；登录后只查本人 | 无额外缓存 |
| `/api/internal/account-deletions` POST | 腾讯 Next.js | PG 账户/学习表、`account_deletion_requests`, `product_events`, `admin_audit_events` | 独立 Bearer Worker Secret；无配置时 fail closed | 清理到期事件；处理到期删除请求并将付款引用最小化去标识 |
| `/api/me` GET | 腾讯 Next.js | PG `app_sessions`, `app_users` | 可选 session | 每次从 session 权威读取，不缓存浏览器身份 |
| `/api/notes` GET, POST, DELETE | 腾讯 Next.js | PG `user_notes`, `video_analyses` | 生产必须登录且只操作本人 note | 无额外缓存；LOCAL_MODE 可用 SQLite |
| `/api/payment/submit` GET, POST | 腾讯 Next.js | PG `payment_submissions` | 必须登录且只查/写本人 | 同套餐仅允许一条 pending；不直接授予权益 |
| `/api/privacy-preferences` GET, PUT | 腾讯 Next.js | PG `user_privacy_preferences` | 必须登录；LOCAL_MODE 明确不可用 | 默认关闭；PUT 只接受布尔同意状态，不接收事件内容 |
| `/api/review` GET, POST | 腾讯 Next.js | PG `user_vocabulary`, `user_word_reviews`, `user_checkins` | 必须登录 | SM-2 状态和打卡直接写权威表 |
| `/api/stripe/create-checkout-session` POST | 腾讯 Next.js | 无 | 兼容入口 | 固定 `410 payment_method_disabled`，不调用 Stripe |
| `/api/sync/notebook` POST | 腾讯 Next.js | PG `user_vocabulary`, `user_word_reviews` | 必须登录；忽略客户端用户归属 | 每条变更在 PG transaction 中应用，再按时间增量拉取 |
| `/api/tasks/[taskId]` GET | 腾讯 Next.js | PG `async_tasks` | 有 owner 的任务仅本人/admin；匿名任务 UUID 只返回无正文状态 | 不向匿名调用者返回 input/output/error 正文 |
| `/api/transcript` POST | 腾讯 Next.js | PG `video_analyses`, `user_videos`; 外部 YouTube/字幕 provider | 可选账户 | 共享字幕缓存命中优先；成功后写 PG |
| `/api/translate-transcript` POST | 腾讯 Next.js | PG `video_analyses`, `video_translations`; 外部 AI | 可选账户 | 读取最新完整翻译；SSE 生成后写翻译版本与字幕缓存 |
| `/api/translations` GET | 腾讯 Next.js | PG `video_translations` | 公开读取视频 capability | 按 video/language/version 读取；LOCAL_MODE 可用 SQLite |
| `/api/user-quotes` GET, POST, DELETE | 腾讯 Next.js | PG `user_quotes` | 生产必须登录且只操作本人 quote | 无额外缓存；LOCAL_MODE 可用 SQLite |
| `/api/user-vocabulary` GET, POST, DELETE | 腾讯 Next.js | PG `user_vocabulary` | 生产必须登录且只操作本人 vocabulary | `(user_id, lemma)` 去重；LOCAL_MODE 可用 SQLite |
| `/api/video-analysis/meta` POST | 腾讯 Next.js | PG `video_analyses`; 外部 YouTube metadata | 公开视频 capability | 优先返回共享 metadata/完整分析，否则回填 metadata |
| `/api/video-analysis` POST | 腾讯 Next.js | PG `video_analyses`, `user_videos`; 外部字幕与 AI | 可选账户 | 完整共享缓存优先；single-flight 生成后写 PG |
| `/api/video-analysis/upload` POST | 腾讯 Next.js | 持久 `uploads/`; PG `video_analyses`, `user_videos`; 外部 ASR/AI | 必须登录；200 MB | 失败删除文件；成功写共享分析和本人历史 |
| `/api/video-info` POST | 腾讯 Next.js | 外部 YouTube metadata | 公开、接口限流 | 不写数据库 |
| `/api/video-stream` GET | 腾讯 Next.js | 持久 `uploads/` | 必须登录 + 不可猜 local ID；尚无 owner 字段 | 支持合法 byte range；非法 range 返回 416 |
| `/api/webhooks/stripe` POST | 腾讯 Next.js | 无 | 兼容入口 | 固定 `410 payment_method_disabled`，不接收支付事件 |
| `/api/word-definitions` POST | 腾讯 Next.js | PG `word_definitions`; 外部 AI | 可选账户 | 批量命中共享词义缓存，缺失项生成后 upsert |
| `/api/worker` POST | 腾讯 Next.js | PG `async_tasks` | 独立 Bearer Worker Secret；handler 仍是 stub | 更新任务状态；无配置或 secret 不匹配时 fail closed |
| `/auth/callback` GET | 腾讯 Next.js | 无 | 历史书签兼容 | 不处理 OAuth/code/next 参数；只同源重定向到登录错误页 |

## 已关闭的双路径

| 旧路径 | 当前处理 |
| --- | --- |
| Supabase Auth / RLS / settings / learning data | SDK 和 runtime client 已移除；全部由腾讯 session + PG 显式 `user_id` 查询承担 |
| Supabase OAuth callback | 只保留同源错误跳转，不交换 OAuth code |
| Stripe checkout / webhook | SDK 已移除；两个兼容端点固定 410；人工审核表是唯一支付状态 |
| Cloudflare full-app Worker / Durable Object | OpenNext、Wrangler、Worker 和 DO 文件已移除；Cloudflare 只在仓库外提供 edge 能力 |
| 独立 `lib/db` PostgreSQL Pool | 统一代理到 `queryTencent()`，不建立第二生产连接池 |
| SQLite production fallback | 只在显式 `LOCAL_MODE=1` 使用；生产缺 `DATABASE_URL` 时安全失败 |

## 已知但不模糊的后续安全债务

这些不是“未知归属”，而是已明确归属后仍需在 T10 或生产扩容前处理的访问控制问题：

1. `/api/video-stream` 要求登录，但没有独立上传记录来验证当前用户是否拥有该 local ID。
2. 单进程内存限流不支持 PM2 cluster；多实例前必须迁移到共享计数存储。
3. 邮箱验证、找回密码和私密支付支持渠道尚未实现，公开注册和真实付款前仍需完成。
