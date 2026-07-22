# Teach Player (VideoMind)

Teach Player 把知识型 YouTube 视频转换成可核验、可收藏、可复习的双语学习材料。粘贴一个链接后，用户可以对照字幕与时间点阅读摘要、关键时刻和 AI 回答，再把单词、句子和笔记保存到个人学习库。

- Canonical 生产地址：[https://video.tpgofighting.top](https://video.tpgofighting.top)
- 兼容地址：[https://teachplayer.tpgofighting.top](https://teachplayer.tpgofighting.top)（尚待配置到 canonical 的显式重定向）
- Bilibili 演示：[观看视频](https://www.bilibili.com/video/BV1nJV36KEnV/)

## 已实现的核心能力

| 能力 | 用户得到什么 |
| --- | --- |
| YouTube 解析 | 元数据、带时间点的字幕和学习工作区 |
| AI 理解 | 可回到原字幕核验的摘要、关键时刻和对话回答 |
| 双语学习 | 字幕翻译、单词释义、句子收藏和个人笔记 |
| 后续复习 | SM-2 单词复习、每日打卡和跨会话学习记录 |
| 账户同步 | 邮箱密码登录，服务端保存历史与个人学习数据 |
| 次级输入 | Bilibili 解析；登录用户可上传单机自托管的本地媒体 |

## 唯一生产架构

```text
Browser
  -> Cloudflare (DNS / TLS / proxy / edge protection only)
  -> Tencent Cloud Nginx
  -> Next.js 16 on PM2, port 3100
       -> Tencent PostgreSQL (authoritative data and sessions)
       -> AI / transcript / ASR providers
       -> uploads/ (single-host local media only)
```

腾讯云的 Next.js + PM2 + PostgreSQL 是唯一生产运行时与数据权威。Cloudflare 不运行应用 Worker、Durable Object、数据库、上传或后台任务；仓库也不再包含 Vercel、OpenNext 或 Wrangler 部署路径。完整决策见 [`docs/decisions/0001-tencent-runtime-and-data-authority.md`](docs/decisions/0001-tencent-runtime-and-data-authority.md)。

PostgreSQL 保存账户、session、全站共享视频/AI/翻译缓存、用户学习数据、隐私偏好、最小化产品事件、删除请求、设置、异步任务和人工付款审核。`LOCAL_MODE=1` 的 SQLite 仅供本地开发，生产禁止启用或双写。

## 技术栈

- Next.js 16 App Router、React 19、TypeScript、Tailwind CSS、shadcn/ui
- Node.js 22、PM2、Nginx
- 腾讯云 PostgreSQL，通过单一 `pg` Pool 访问
- 自托管邮箱密码认证，scrypt 密码哈希与 HttpOnly Cookie Session
- OpenAI-compatible / Gemini AI Provider 适配
- YouTube 多级字幕回退，可选 Supadata；Bilibili/本地媒体可选 ASR

历史目录名 `lib/supabase/` 暂时保留以控制迁移范围，但其中运行时代码已经访问腾讯 PostgreSQL，不代表仍使用 Supabase。新功能必须直接使用 `lib/tencent-db.ts`，不得恢复 Supabase SDK。

## 本地开发

要求 Node.js 22+ 和 npm。

```bash
cp .env.example .env.local
npm ci
npm run dev
```

应用默认开发端口由 Next.js 决定；生产 `npm start` 固定监听 `3100`。

### 环境变量

生产必需：

```env
NEXT_PUBLIC_APP_URL=https://video.tpgofighting.top
DATABASE_URL=postgresql://teachplayer_app:<password>@127.0.0.1:5432/teachplayer

AI_PROVIDER=openai-compatible
AI_API_BASE_URL=https://api.example.com/v1
AI_API_KEY=<server-only-key>
AI_MODEL=<provider-model>
```

按启用能力选择：

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

- 所有 key 与 `DATABASE_URL` 只能放在服务器环境或密钥管理系统中。
- `ASR_API_KEY` 缺失时上传/ASR 安全失败，不会使用源码回退值。轮换方法见 [`docs/operations/secret-rotation.md`](docs/operations/secret-rotation.md)。
- 认证不需要静态 session secret：每次登录生成高熵随机 token，数据库只保存 SHA-256 哈希。
- 两个内部 Worker Secret 必须彼此独立，仅供服务器到服务器调用；缺失时相关 Worker 安全失败。
- 其他开发专用选项以 [`.env.example`](.env.example) 和对应模块为准。

## 质量门禁

提交或发布前按顺序运行：

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

测试不应访问真实 AI、支付、用户数据库或生产凭证。CI 使用同一组命令；本地构建成功不能替代线上验证。

## 腾讯云发布

仓库不提供会隐藏生产状态的“一键部署”命令。发布负责人应在腾讯云主机上使用固定目录和 PM2 进程执行：

1. 先创建 PostgreSQL 备份并记录当前 Git commit 与 PM2 版本。
2. 拉取已审核 commit，在 Node.js 22 环境执行上述五项质量门禁。
3. 确认 `.env.local` 至少包含 canonical URL、数据库和有效 AI 配置。
4. 用 `npm start` 对应的 PM2 配置在 `3100` 端口启动或 reload；Nginx 只反代该端口。
5. 验证 canonical 域名、注册/登录、`/api/me`、一次视频解析、保存/删除、复习和上传边界。
6. 失败时恢复发布前 commit 与数据库备份，不把旧页面仍可访问视为回滚成功。

具体备份、恢复、数据表和扩容边界见 [`docs/tencent-cloud-architecture.md`](docs/tencent-cloud-architecture.md)。本任务只定义路径，不会自动部署、迁移生产数据库、修改 DNS 或轮换密钥。

## 支付边界

首发采用站内付款凭证提交和管理员人工审核。Stripe 创建会话与 webhook 路由被明确禁用并返回 `410 payment_method_disabled`；在真实国内支付能力完成前，不展示或恢复 Stripe 支付承诺。

## 项目结构

```text
app/
  api/                         41 个腾讯云 Next.js API 路由
  video/[videoId]/             视频学习工作区
  history/ vocabulary/ quotes/ notes/ review/
lib/
  ai/                          AI Provider 与 prompts
  youtube/                     YouTube 元数据和字幕
  tencent-db.ts                唯一生产数据库连接与 schema
  tencent-auth.ts              用户和 session
  supabase/                    历史命名的腾讯 PG 适配模块
  db/                          LOCAL_MODE 与兼容入口
  security/                    API 安全中间件
components/                    页面与业务组件
docs/                          架构、ADR、API 文档与执行证据
```

接口级运行时、数据库、认证和缓存归属见 [`docs/architecture/api-ownership-matrix.md`](docs/architecture/api-ownership-matrix.md)，当前产品规格见 [`TEACH_PLAYER_SPEC.md`](TEACH_PLAYER_SPEC.md)，顺序执行进度见 [`CODEX_EXECUTION_TODO.md`](CODEX_EXECUTION_TODO.md)。

## Android

Expo Android 源码位于 `android-app` 分支，已发布产物以 [GitHub Releases](https://github.com/TPGoFighting/cc-videomind/releases) 为准。Web 构建通过不代表 Android 发布成功，APK 仍需单独验证构建产物、签名和下载链接。

## License

MIT
