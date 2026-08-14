# Teach Player (VideoMind) — Web App 功能全览

> 生成日期：2026-05-21  
> 用途：与安卓 APP 端同步功能，确保所有 Web 端已有功能在 APP 端都有对应设计  
> 部署地址：`https://video.tpgofighting.top`

---

## 一、页面路由

| 路由 | 页面名称 | 说明 |
|------|---------|------|
| `/` | 首页 | 输入框 + 推荐视频 + 特性介绍 + 统计 |
| `/video/[videoId]` | 视频工作区 | 核心功能：播放器 + 转录 + 问答 + 笔记 + 要点 |
| `/history` | 历史记录 | 解析过的所有视频列表 |
| `/vocabulary` | 单词本 | 收藏的所有单词（含例句、释义） |
| `/quotes` | 句子本 | 收藏的所有句子 + 笔记 |
| `/notes` | 笔记本 | 所有视频笔记汇总 |
| `/review` | 每日复习 | 答题式间隔复习 + 打卡 |
| `/settings` | 设置 | 用户设置 / 管理 |
| `/login` | 登录 | 自托管邮箱密码登录 |
| `/register` | 注册 | 注册新账号 |
| `/privacy` | 隐私政策 | 数据类型、可选分析、保留期与账户权利 |
| `/terms` | 服务条款 | 服务、AI、付款和责任边界 |
| `/support` | 支持与退款说明 | 公开问题追踪、站内数据权利和付款支持边界 |

---

## 二、导航栏

| 入口 | 图标 | 桌面端 | 移动端 |
|------|------|--------|--------|
| 每日复习 | 🔥 | 菜单第一项，琥珀色高亮 | 同 |
| 安卓APP下载 | 📥 | 菜单第二项（Beta 标签） | 同，链接指向 GitHub Release |
| 历史记录 | 🕐 | 菜单 | 同 |
| 单词本 | 📖 | 菜单 | 同 |
| 句子本 | 🔖 | 菜单 | 同 |
| 笔记本 | 📓 | 菜单 | 同 |
| 设置 | ⚙️ | 菜单 | 同 |
| 退出登录 | — | 菜单底部 | 同 |

登录状态：未登录显示「注册 + 登录」按钮；已登录显示 ☰ 用户菜单。

---

## 三、功能模块详解

### 3.1 首页 (`/`)

**桌面端 (md+)**：
- Hero 区域：品牌标语 + 链接输入框 + 操作步骤 3 步
- 特性网格：6 个特性卡片（精准转录、智能缓存、要点时刻、对话问答、多格式兼容、接口可替换）
- 统计数据展示
- 推荐视频：随机 3 个视频卡片（真实 YouTube 封面、标题、频道名）
- 底部 CTA + Footer

**移动端 (默认 `< md`)**：
- 居中品牌标识 + 输入框 + 4 个建议标签（教程/科技/演讲/纪录片）
- 推荐视频：随机 2 个视频卡片（真实元数据）
- 输入支持所有 YouTube 格式：`youtube.com` / `youtu.be` / `shorts` / `embed`

**核心交互**：粘贴链接 → 调用 `/api/video-info` 解析视频 ID → 跳转 `/video/[videoId]`

---

### 3.2 视频工作区 (`/video/[videoId]`)

**布局**：
- 左：YouTube 播放器（内嵌 iframe）
- 右：侧边栏 Tab（桌面端）/ 顶部 Tab（移动端）

**Tab 内容**：

| Tab | 功能 |
|-----|------|
| **转录文本** | 时间戳 + 原文/译文/双语切换；高亮单词可交互；点击时间跳转播放；自动跟随播放滚动；句子收藏 |
| **Chat** | AI 对话问答，基于视频内容引用时间戳，建议问题快捷入口 |
| **笔记** | 保存文字笔记（关联当前视频）；历史笔记列表 + 删除 |
| **复习** | 快捷入口 → 跳转 `/review` 页面 |

**转录文本 Tab 细节**：
- **显示模式**：原文(en) / 译文(zh) / 双语(bilingual) 三态切换
- **自动跟随**：播放时自动滚动到当前段落（舒适区算法：对齐视口 25%-40%）
- **手动滚动**：用户手动滚动后暂停自动跟随，出现「跳转到当前」按钮
- **单词交互**（桌面端）：鼠标 hover 0.5s → 弹出单词卡片（音标 + 释义 + 例句），移开或 ESC 关闭
- **单词交互**（移动端）：点击单词 → 弹出单词卡片居中，点遮罩或 X 关闭
- **单词卡片**：显示 lemma / 音标 / 词性 / 中英释义 / 例句；收藏按钮（BookmarkPlus → Check 已收藏）
- **句子收藏**：每条转录行有收藏按钮，可保存原文+译文+时间戳
- **未翻译提示**：切换中英/中文模式时如果没有翻译数据，显示提示文字

**笔记 Tab 细节**：
- 输入框（textarea）→ 保存按钮
- 自动 POST 到 `/api/notes`，保存后状态反馈「已保存」
- 历史笔记列表：每条显示正文 + 时间 + hover 显示删除按钮
- 未登录：提示登录后可保存

**Chat Tab 细节**：
- 基于视频内容对话，每轮对话带时间戳引用
- 推荐问题入口（来自 AI 解析结果）

---

### 3.3 英语学习系统

#### 单词收藏流程
1. 收藏途径：视频播放页转录文本中点击高亮单词 → 单词卡片中点击收藏按钮
2. API：`POST /api/user-vocabulary` 写入（`user_vocabulary` 表，关联 `word_definitions` 表）
3. 去重：同一用户同一 `word_id` 唯一约束

#### 句子收藏流程
1. 收藏途径：视频播放页转录文本行点击「收藏句子」按钮
2. API：`POST /api/user-quotes` 写入（`user_quotes` 表）
3. 存储：原文 + 译文 + 时间戳 + 可选笔记

#### 单词定义
- `word_definitions` 表存储：lemma / phonetic / part_of_speech / definition_zh / definition_en / example_en / example_zh
- API：`/api/word-definitions` 批量获取单词定义（传入 lemmas 数组，一次最多 400 个）

---

### 3.4 间隔复习系统 (`/review`)

**核心算法**：SM-2（SuperMemo 2）间隔重复

| 复习次数 | 间隔 | 说明 |
|---------|------|------|
| 0 次 | 立即 | 首次学习，next_review_at = now |
| 1 次 | 1 天 | |
| 2 次 | 3 天 | |
| 3 次 | 7 天 | |
| 4 次+ | interval × easeFactor | 动态增长 |

**评分等级**：
| quality | 含义 | 影响 |
|---------|------|------|
| 0 | 忘了 | 重置 repetition=0，easeFactor 下降，10分钟后重试 |
| 2 | 模糊 | SM-2 正常处理 |
| 3 | 记得 | 正常进入下一间隔 |
| 5 | 简单 | 间隔×1.2 加速 |

**单词状态**：
- `learning` — 新词（第一次复习）
- `reviewing` — 复习中
- `mastered` — 间隔 ≥30 天，视为已掌握

**答题模式 UI**：
1. 顶部：进度条（当前/总数）+ 🔥连击计数
2. 题型 1「选择正确释义」：显示英文单词 → 4 个中文选项（含 3 个随机干扰项）
3. 题型 2「选择正确单词」：显示中文释义 → 4 个英文选项
4. 两种题型 50/50 随机
5. 选对：选项变绿 ✅ + 连击+1，0.8s 自动下一题
6. 选错：选项变红 ❌ + 显示正确答案 + 连击归零，1.2s 自动下一题
7. 答完：结果页 → 正确率 / 最高连击 / 今日总量 / 日历热力图 / 再来一组

**每日打卡**：
- 每答一题自动同步打卡（`user_checkins` 表，按日期去重累加）
- 每天复习 ≥10 个单词即算打卡成功
- 连续天数计算：今天往前逐日检查有 ≥10 个单词的打卡记录
- 打卡日历：30 天 GitHub 风格热力图（绿色深浅），今日带白色边框标记

**首次访问**：自动从单词本(`user_vocabulary`)同步所有单词到复习队列，立即到期可复习

---

### 3.5 腾讯 PostgreSQL 数据表

#### 核心业务表

| 表名 | 用途 |
|------|------|
| `app_users` | 用户邮箱、密码哈希、角色和订阅等级 |
| `app_sessions` | 登录会话 token 哈希与过期时间 |
| `app_settings` / `user_ai_settings` | 全局与用户 AI 配置 |
| `payment_submissions` | 人工付款凭证提交与审核状态 |
| `user_privacy_preferences` | 用户的可选产品分析同意，默认关闭 |
| `product_events` | 严格白名单、最长 180 天的无正文产品事件 |
| `account_deletion_requests` | 账户删除状态与 7 天撤销期 |
| `admin_audit_events` | 不含用户正文、最长 365 天的管理操作审计 |
| `video_analyses` | 视频解析缓存（metadata, transcript, analysis） |
| `user_videos` | 用户解析记录（user_id, video_id, created_at） |
| `user_notes` | 笔记（user_id, video_id, body, timestamp_seconds） |
| `user_vocabulary` | 单词本（user_id, lemma, video_id 与释义快照） |
| `word_definitions` | 单词定义（lemma, phonetic, part_of_speech, definition_zh/en, example_en/zh） |
| `user_quotes` | 句子本（user_id, video_id, text_en, text_zh, start_time, end_time, notes） |
| `user_word_reviews` | 复习记录（user_id, lemma, repetitions, ease_factor, interval_days, next_review_at, status） |
| `user_checkins` | 每日打卡（user_id, checkin_date, word_count） |
| `video_translations` | 按视频、语言、版本保存的字幕翻译 |
| `ai_results_cache` | 摘要、关键时刻和综合分析共享缓存 |
| `video_chunks` | RAG 字幕切片与 embedding JSON |
| `async_tasks` | 异步任务状态、输入与输出 |

腾讯 PostgreSQL 是唯一生产数据权威。服务端个人数据 SQL 必须从当前 Cookie/Bearer Session 取得用户，并显式按 `user_id` 过滤；不得信任前端传来的用户 ID。`LOCAL_MODE=1` 的 SQLite 仅供本地开发，生产禁止启用或双写。

---

## 四、API 接口清单

### 视频相关

| 方法 | 路由 | 功能 |
|------|------|------|
| POST | `/api/video-info` | 解析 YouTube 链接，返回 videoId + metadata |
| POST | `/api/video-analysis` | 获取或生成视频全量解析结果（metadata + transcript + analysis），使用 PostgreSQL 共享缓存 |
| POST | `/api/video-analysis/meta` | 先获取元数据，并返回已有完整缓存（如有） |
| POST | `/api/video-analysis/upload` | 登录用户上传自托管主机媒体并分析 |
| GET | `/api/video-stream?id=xxx` | 登录用户读取自托管主机媒体 |
| POST | `/api/transcript` | 获取视频转录文本 |
| POST | `/api/translate-transcript` | 翻译转录文本（中英文） |
| GET | `/api/translations` | 读取最新翻译版本 |
| GET | `/api/bilibili-parse-stream` | Bilibili 流式解析（次级入口） |

### AI 生成

| 方法 | 路由 | 功能 |
|------|------|------|
| POST | `/api/chat` | AI 对话问答（基于视频内容） |
| POST | `/api/generate-moments` | 生成要点时刻（smart/fast 双模式） |
| POST | `/api/generate-summary` | 生成结构化摘要 |

### 用户功能

| 方法 | 路由 | 功能 |
|------|------|------|
| GET | `/api/history` | 用户视频解析历史（含标题/封面/频道/时间） |
| GET/POST | `/api/notes?videoId=xxx` | 笔记：GET 查列表 / POST 新增 |
| DELETE | `/api/notes` | 删除笔记 `{noteId}` |
| GET/POST/DELETE | `/api/user-vocabulary` | 单词本：GET 列表 / POST 收藏 / DELETE 删除 |
| GET/POST/DELETE | `/api/user-quotes` | 句子本：GET 列表 / POST 收藏 / DELETE 删除 |
| GET/POST | `/api/review` | 复习：GET 获取待复习单词 / POST 提交评分 |
| GET | `/api/checkin` | 打卡：获取连续天数 + 打卡日历 + 今日状态 |
| GET | `/api/me` | 当前用户信息 |
| POST | `/api/word-definitions` | 批量获取单词定义（body: `{lemmas: [...]}`） |
| POST | `/api/sync/notebook` | 认证用户的移动端增量同步 |
| GET/PUT | `/api/privacy-preferences` | 读取/更新非必要产品分析同意 |
| GET | `/api/account/export` | 下载本人的数据副本，排除密码/session/API Key |
| GET/POST/DELETE | `/api/account/deletion-request` | 查看、提交或撤销账户删除请求 |

### 管理 / 设置

| 方法 | 路由 | 功能 |
|------|------|------|
| GET/PUT | `/api/admin/settings` | 管理员全局设置 / 用户个人 AI 设置 |
| POST | `/api/admin/settings/test` | 管理员测试 AI 设置 |
| GET | `/api/admin/users` | 管理员查看用户 |
| GET | `/api/admin/videos` | 管理员查看视频缓存统计 |
| GET/PUT | `/api/admin/payments` | 管理员审核人工付款提交 |
| GET | `/api/admin/metrics` | 管理员查看经同意事件的 7–180 天聚合 |
| GET/POST | `/api/payment/submit` | 用户查询/提交付款凭证 |
| POST | `/api/internal/account-deletions` | Bearer Secret 保护的到期删除与保留期清理 Worker |
| GET | `/auth/callback` | 已废弃 OAuth 入口；同源重定向到登录错误页 |

### 支付边界

| 方法 | 路由 | 功能 |
|------|------|------|
| POST | `/api/stripe/create-checkout-session` | 已禁用；返回 `410 payment_method_disabled` |
| POST | `/api/webhooks/stripe` | 已禁用；返回 `410 payment_method_disabled` |

首发只支持站内提交付款凭证、管理员人工审核。前端不得展示 Stripe 可用状态，也不得把待审核提交表述为已付款。

---

## 五、非功能性细节

### 响应式设计
- 基准断点：sm(640px) / md(768px) / lg(1024px)
- 桌面端：完整侧边栏 + 多列布局
- 平板端：中等间距自适应
- 移动端：单列布局，Tab 切换，触摸友好（min 44px 点击区域）

### 性能优化
- 可静态生成的营销页面由 Next.js 构建；用户页面按会话在运行时读取
- 视频分析、AI 结果、翻译与词义使用腾讯 PostgreSQL 共享缓存
- YouTube 缩略图懒加载 + `unoptimized`（避免 Next.js 图片处理开销）

### 身份认证
- 自托管邮箱密码认证；密码使用 scrypt + 随机盐
- 随机会话 token 通过 HttpOnly、SameSite=Lax Cookie 传递，数据库只保存 SHA-256 哈希；移动端可使用 Bearer token
- API 路由统一从服务端会话获取用户，个人数据 SQL 显式带 `user_id`
- OAuth、验证邮件和找回密码当前未实现，不得在 UI 中承诺
- 进程内 rate limit 只保证单 PM2 进程；Cloudflare/Nginx 负责外围防护，多实例前需增加共享限流器

### 生产运行与上传

- Canonical 域名为 `https://video.tpgofighting.top`；`teachplayer.tpgofighting.top` 是待显式重定向的兼容域名
- Next.js + PM2 + PostgreSQL 运行在腾讯云，Cloudflare 仅承担 DNS/TLS/代理/边缘防护
- 本地媒体文件只存放在单台自托管主机的 `uploads/`；上传与流读取要求登录，最大文件 200 MB
- 当前文件 URL 是不可猜随机 ID 的 capability，并不替代所有权字段；在支持共享、多实例或对象存储前必须先增加资源归属与迁移设计

### 交互细节
- 触摸设备 `active:scale-[0.97]` 按下反馈
- 动画系统：`animate-fade-in-up` / `animate-float-slow` / `animate-breathe` / `animate-shimmer` / `scale-in` / `card-lift`
- 骨架屏加载态：所有列表页和数据区

### 多语言
- 中英文双语支持
- 转录文本可切换原文/译文/双语
- AI 生成结果支持中英双语

### URL 适配
- YouTube 链接格式：`youtube.com/watch?v=` / `youtu.be/` / `shorts/` / `embed/`
- 自动提取 videoId（`VideoIdSchema` Zod 验证）

---

## 六、架构资料

- 唯一生产架构：`docs/decisions/0001-tencent-runtime-and-data-authority.md`
- 全量接口归属：`docs/architecture/api-ownership-matrix.md`
- 腾讯云部署与恢复：`docs/tencent-cloud-architecture.md`
- 当前顺序执行进度：`CODEX_EXECUTION_TODO.md`
