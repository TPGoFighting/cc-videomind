# cc-videomind 文档目录

> 本索引包含历史自动生成文档。生产事实以根目录 README、ADR、架构矩阵和当前源代码为准；带 Supabase、Stripe、Vercel、OpenNext 或 Worker 名称的旧页面可能只是归档，不得直接用于发布。

---

## 📋 项目文档

| 文件 | 说明 |
|------|------|
| [README.md.md](README.md.md) | 项目介绍 |
| [TEACH_PLAYER_SPEC.md.md](TEACH_PLAYER_SPEC.md.md) | 产品规格说明 |
| [DESIGN.md.md](DESIGN.md.md) | 设计文档 |
| [CodeReview.md.md](CodeReview.md.md) | 代码审查报告 |
| [REVIEW-FINDINGS.md.md](REVIEW-FINDINGS.md.md) | 审查发现汇总 |
| [Rule.md.md](Rule.md.md) | 开发规范 |
| [Tasks.md.md](Tasks.md.md) | 任务清单 |
| [Continue.md.md](Continue.md.md) | 待续事项 |
| [Difficulty.md.md](Difficulty.md.md) | 难点记录 |
| [腾讯云自托管架构](tencent-cloud-architecture.md) | PostgreSQL、认证、备份与发布指南 |
| [ADR-0001](decisions/0001-tencent-runtime-and-data-authority.md) | 唯一生产运行时与数据权威决策 |
| [API 归属矩阵](architecture/api-ownership-matrix.md) | 全部路由的运行时、数据、鉴权和缓存归属 |

---

## 🤖 AI 相关文档

| 文件 | 说明 |
|------|------|
| [AI模型API格式参考.md](AI模型API格式参考.md) | 主流 AI 模型 API 格式对比 |
| [项目API格式需求.md](项目API格式需求.md) | 项目对 AI API 的具体需求 |
| [lib/ai/provider.md](lib/ai/provider.md) | AI Provider 实现 |
| [lib/ai/provider-registry.md](lib/ai/provider-registry.md) | Provider 注册机制 |
| [lib/ai/prompts.md](lib/ai/prompts.md) | Prompt 模板 |
| [lib/ai/prompts-learn.md](lib/ai/prompts-learn.md) | 学习功能 Prompt |
| [lib/ai/prompts-v2.md](lib/ai/prompts-v2.md) | V2 Prompt 模板 |

---

## 🔌 API 端点文档

### 核心 AI 功能

| 文件 | 端点 | 说明 |
|------|------|------|
| [api/word-definitions.md](api/word-definitions.md) | `POST /api/word-definitions` | 词义生成 |
| [api/generate-moments.md](api/generate-moments.md) | `POST /api/generate-moments` | 关键时刻提取 |
| [api/generate-summary.md](api/generate-summary.md) | `POST /api/generate-summary` | 内容摘要 |
| [api/chat.md](api/chat.md) | `POST /api/chat` | 对话问答 |
| [api/translate-transcript.md](api/translate-transcript.md) | `POST /api/translate-transcript` | 字幕翻译 (SSE) |
| [api/analyze.md](api/video-analysis.md) | `POST /api/analyze` | 视频分析 |

### 视频相关

| 文件 | 端点 | 说明 |
|------|------|------|
| [api/transcript.md](api/transcript.md) | `POST /api/transcript` | 字幕提取 |
| [api/video-info.md](api/video-info.md) | `GET /api/video-info` | 视频信息 |
| [api/video-stream.md](api/video-stream.md) | `GET /api/video-stream` | 视频流 |
| [api/video-analysis/meta.md](api/video-analysis/meta.md) | `GET /api/video-analysis/meta` | 分析元数据 |
| [api/video-analysis/upload.md](api/video-analysis/upload.md) | `POST /api/video-analysis/upload` | 上传分析 |
| [api/bilibili-parse-stream.md](api/bilibili-parse-stream.md) | `POST /api/bilibili-parse-stream` | B站解析 |

### 用户功能

| 文件 | 端点 | 说明 |
|------|------|------|
| [api/me.md](api/me.md) | `GET /api/me` | 用户信息 |
| [api/history.md](api/history.md) | `GET /api/history` | 历史记录 |
| [api/notes.md](api/notes.md) | `GET/POST /api/notes` | 笔记管理 |
| [api/user-vocabulary.md](api/user-vocabulary.md) | `GET/POST /api/user-vocabulary` | 词汇本 |
| [api/user-quotes.md](api/user-quotes.md) | `GET/POST /api/user-quotes` | 名言本 |
| [api/checkin.md](api/checkin.md) | `POST /api/checkin` | 签到 |
| [api/review.md](api/review.md) | `POST /api/review` | 复习 |

### 管理后台

| 文件 | 端点 | 说明 |
|------|------|------|
| [api/admin/users.md](api/admin/users.md) | `GET /api/admin/users` | 用户管理 |
| [api/admin/videos.md](api/admin/videos.md) | `GET /api/admin/videos` | 视频管理 |
| [api/admin/settings.md](api/admin/settings.md) | `GET/POST /api/admin/settings` | 系统设置 |
| [api/admin/settings/test.md](api/admin/settings/test.md) | `POST /api/admin/settings/test` | 设置测试 |
| [api/admin/payments.md](api/admin/payments.md) | `GET /api/admin/payments` | 支付管理 |

### 支付相关

| 文件 | 端点 | 说明 |
|------|------|------|
| [api/payment/submit.md](api/payment/submit.md) | `POST /api/payment/submit` | 提交支付 |
| [api/stripe/create-checkout-session.md](api/stripe/create-checkout-session.md) | `POST /api/stripe/create-checkout-session` | 已禁用兼容端点（410） |
| [api/webhooks/stripe.md](api/webhooks/stripe.md) | `POST /api/webhooks/stripe` | 已禁用兼容端点（410） |

### 同步功能

| 文件 | 端点 | 说明 |
|------|------|------|
| [api/sync/notebook.md](api/sync/notebook.md) | `POST /api/sync/notebook` | 笔记本同步 |

---

## 📁 核心库文档

### AI 模块 (`lib/ai/`)

| 文件 | 说明 |
|------|------|
| [lib/ai/provider.md](lib/ai/provider.md) | AI Provider 核心实现 |
| [lib/ai/provider-registry.md](lib/ai/provider-registry.md) | Provider 注册机制 |
| [lib/ai/prompts.md](lib/ai/prompts.md) | Prompt 模板 |
| [lib/ai/prompts-learn.md](lib/ai/prompts-learn.md) | 学习功能 Prompt |
| [lib/ai/prompts-v2.md](lib/ai/prompts-v2.md) | V2 Prompt 模板 |

### YouTube 模块 (`lib/youtube/`)

| 文件 | 说明 |
|------|------|
| [lib/youtube/transcript-provider.md](lib/youtube/transcript-provider.md) | 字幕提取 Provider |
| [lib/youtube/transcript-provider.test.md](lib/youtube/transcript-provider.test.md) | 字幕提取测试 |
| [lib/youtube/youtube-transcript-pkg-provider.md](lib/youtube/youtube-transcript-pkg-provider.md) | npm 包字幕提取 |
| [lib/youtube/metadata.md](lib/youtube/metadata.md) | YouTube 元数据 |
| [lib/youtube/id.md](lib/youtube/id.md) | YouTube ID 解析 |

### Bilibili 模块 (`lib/bilibili/`)

| 文件 | 说明 |
|------|------|
| [lib/bilibili/transcript-provider.md](lib/bilibili/transcript-provider.md) | B站字幕提取 |
| [lib/bilibili/metadata.md](lib/bilibili/metadata.md) | B站元数据 |
| [lib/bilibili/difficulty-analyzer.md](lib/bilibili/difficulty-analyzer.md) | 难度分析 |
| [lib/bilibili/risk-manager.md](lib/bilibili/risk-manager.md) | 风险管理 |
| [lib/bilibili/id.md](lib/bilibili/id.md) | B站 ID 解析 |

### 历史命名的腾讯 PostgreSQL 适配模块 (`lib/supabase/`)

`client.ts` 与 `server.ts` 已删除；下列仍存在的 cache/admin/quota 模块只保留历史路径名，生产实现使用 `lib/tencent-db.ts`。

| 文件 | 说明 |
|------|------|
| [lib/supabase/admin.md](lib/supabase/admin.md) | 管理员功能 |
| [lib/supabase/quota.md](lib/supabase/quota.md) | 配额管理 |
| [lib/supabase/quota.test.md](lib/supabase/quota.test.md) | 配额测试 |
| [lib/supabase/cache.md](lib/supabase/cache.md) | 缓存机制 |
| [lib/supabase/cache-learn.md](lib/supabase/cache-learn.md) | 学习缓存 |
| [lib/supabase/cache-v2.md](lib/supabase/cache-v2.md) | V2 缓存 |

### 安全模块 (`lib/security/`)

| 文件 | 说明 |
|------|------|
| [lib/security/middleware.md](lib/security/middleware.md) | 安全中间件 |
| [lib/security/rate-limit.md](lib/security/rate-limit.md) | 速率限制 |

### 工具模块 (`lib/utils/`)

| 文件 | 说明 |
|------|------|
| [lib/utils/json.ts.md](lib/utils/json.ts.md) | JSON 解析工具 |
| [lib/utils/http.ts.md](lib/utils/http.ts.md) | HTTP 工具 |
| [lib/utils/api.ts.md](lib/utils/api.ts.md) | API 工具 |
| [lib/utils/chunk.ts.md](lib/utils/chunk.ts.md) | 分块工具 |
| [lib/utils/moments-validator.ts.md](lib/utils/moments-validator.ts.md) | Moments 验证 |
| [lib/utils/time.ts.md](lib/utils/time.ts.md) | 时间工具 |
| [lib/utils/month.ts.md](lib/utils/month.ts.md) | 月份工具 |
| [lib/utils/cn.ts.md](lib/utils/cn.ts.md) | 类名合并 |
| [lib/utils/tokenize.ts.md](lib/utils/tokenize.ts.md) | 分词工具 |

### Hooks (`lib/hooks/`)

| 文件 | 说明 |
|------|------|
| [lib/hooks/useWordDefinitions.ts.md](lib/hooks/useWordDefinitions.ts.md) | 词义 Hook |
| [lib/hooks/useCachedFetch.ts.md](lib/hooks/useCachedFetch.ts.md) | 缓存请求 Hook |
| [lib/hooks/useDisplayMode.ts.md](lib/hooks/useDisplayMode.ts.md) | 显示模式 Hook |
| [lib/hooks/useYouTubeStatus.ts.md](lib/hooks/useYouTubeStatus.ts.md) | YouTube 状态 Hook |
| [lib/hooks/useButtonPress.ts.md](lib/hooks/useButtonPress.ts.md) | 按钮按压 Hook |
| [lib/hooks/useCardLift.ts.md](lib/hooks/useCardLift.ts.md) | 卡片提升 Hook |
| [lib/hooks/useCountUp.ts.md](lib/hooks/useCountUp.ts.md) | 数字递增 Hook |
| [lib/hooks/useScrollReveal.ts.md](lib/hooks/useScrollReveal.ts.md) | 滚动显示 Hook |

### 动画模块 (`lib/gsap/`)

| 文件 | 说明 |
|------|------|
| [lib/gsap/constants.ts.md](lib/gsap/constants.ts.md) | 动画常量 |
| [lib/gsap/safe-animate.ts.md](lib/gsap/safe-animate.ts.md) | 安全动画 |

### 其他

| 文件 | 说明 |
|------|------|
| [lib/types.ts.md](lib/types.ts.md) | 类型定义 |
| [lib/navigation.ts.md](lib/navigation.ts.md) | 导航配置 |
| [lib/plans.ts.md](lib/plans.ts.md) | 套餐计划 |
| [lib/glb-models.ts.md](lib/glb-models.ts.md) | 3D 模型 |

---

## 🎨 前端组件文档

### 页面组件

| 文件 | 说明 |
|------|------|
| [page.md](page.md) | 首页 |
| [layout.md](layout.md) | 布局 |
| [login.md](login.md) | 登录页 |
| [register.md](register.md) | 注册页 |
| [settings.md](settings.md) | 设置页 |
| [explore.md](explore.md) | 探索页 |
| [history.md](history.md) | 历史页 |
| [notes.md](notes.md) | 笔记页 |
| [quotes.md](quotes.md) | 名言页 |
| [vocabulary.md](vocabulary.md) | 词汇页 |
| [subscribe.md](subscribe.md) | 订阅页 |
| [review.md](review.md) | 复习页 |

### 视频工作区

| 文件 | 说明 |
|------|------|
| [video-workspace.md](video-workspace.md) | 视频工作区 |
| [video-player.md](video-player.md) | 视频播放器 |
| [video-url-input.md](video-url-input.md) | 视频 URL 输入 |
| [transcript-viewer.md](transcript-viewer.md) | 字幕查看器 |
| [chat-panel.md](chat-panel.md) | 对话面板 |
| [highlights-panel.md](highlights-panel.md) | 高亮面板 |
| [summary-panel.md](summary-panel.md) | 摘要面板 |
| [notes-panel.md](notes-panel.md) | 笔记面板 |
| [word-card.md](word-card.md) | 词义卡片 |

### 首页组件 (`home/`)

| 文件 | 说明 |
|------|------|
| [home/hero-section.md](home/hero-section.md) | Hero 区域 |
| [home/bento-features.md](home/bento-features.md) | Bento 特性展示 |
| [home/features-scroll.md](home/features-scroll.md) | 特性滚动 |
| [home/marquee-strip.md](home/marquee-strip.md) | 滚动条 |
| [home/pricing-section.md](home/pricing-section.md) | 价格区域 |
| [home/roadmap-section.md](home/roadmap-section.md) | 路线图 |
| [home/scroll-nav.md](home/scroll-nav.md) | 滚动导航 |
| [home/why-section.md](home/why-section.md) | Why 区域 |

### 移动端组件

| 文件 | 说明 |
|------|------|
| [mobile-home.md](mobile-home.md) | 移动端首页 |
| [mobile-tab-bar.md](mobile-tab-bar.md) | 标签栏 |
| [mobile-tab-bar-client.md](mobile-tab-bar-client.md) | 标签栏客户端 |
| [mobile-video-tabs.md](mobile-video-tabs.md) | 视频标签 |

### UI 组件 (`ui/`)

| 文件 | 说明 |
|------|------|
| [ui/button.md](ui/button.md) | 按钮组件 |
| [ui/card.md](ui/card.md) | 卡片组件 |
| [ui/input.md](ui/input.md) | 输入框组件 |
| [ui/textarea.md](ui/textarea.md) | 文本域组件 |
| [ui/badge.md](ui/badge.md) | 徽章组件 |

### 其他组件

| 文件 | 说明 |
|------|------|
| [navbar.md](navbar.md) | 导航栏 |
| [sidebar-tabs.md](sidebar-tabs.md) | 侧边栏标签 |
| [auth-context.md](auth-context.md) | 认证上下文 |
| [display-mode-toggle.md](display-mode-toggle.md) | 显示模式切换 |
| [animated-background.md](animated-background.md) | 动画背景 |
| [game-icon.md](game-icon.md) | 游戏图标 |
| [glb-decoration.md](glb-decoration.md) | 3D 装饰 |
| [gsap-provider.md](gsap-provider.md) | GSAP Provider |
| [stats-section.md](stats-section.md) | 统计区域 |
| [streak-calendar.md](streak-calendar.md) | 连续签到日历 |
| [youtube-status-alert.md](youtube-status-alert.md) | YouTube 状态提醒 |
| [youtube-status-banner.md](youtube-status-banner.md) | YouTube 状态横幅 |
| [example-videos.md](example-videos.md) | 示例视频 |

---

## 🗄️ 数据库文档

### 历史迁移档案 (`supabase/migrations/`)

这些 SQL 不是当前生产迁移入口；腾讯 schema 权威定义在 `lib/tencent-db.ts`。

| 文件 | 说明 |
|------|------|
| [supabase/migrations/001_initial_schema.sql.md](supabase/migrations/001_initial_schema.sql.md) | 初始 Schema |
| [supabase/migrations/002_videomind_existing_project_compat.sql.md](supabase/migrations/002_videomind_existing_project_compat.sql.md) | 旧项目兼容 |
| [supabase/migrations/003_moments_summary.sql.md](supabase/migrations/003_moments_summary.sql.md) | Moments/Summary |
| [supabase/migrations/004_admin_and_settings.sql.md](supabase/migrations/004_admin_and_settings.sql.md) | 管理员/设置 |
| [supabase/migrations/005_english_learning.sql.md](supabase/migrations/005_english_learning.sql.md) | 英语学习 |
| [supabase/migrations/006_fix_cache_unique.sql.md](supabase/migrations/006_fix_cache_unique.sql.md) | 缓存唯一性修复 |
| [supabase/migrations/007_word_review.sql.md](supabase/migrations/007_word_review.sql.md) | 单词复习 |
| [supabase/migrations/008_quota_ip_tracking.sql.md](supabase/migrations/008_quota_ip_tracking.sql.md) | 配额/IP 追踪 |
| [supabase/migrations/010_subscription_tiers.sql.md](supabase/migrations/010_subscription_tiers.sql.md) | 订阅层级 |
| [supabase/migrations/011_payment_submissions.sql.md](supabase/migrations/011_payment_submissions.sql.md) | 支付提交 |
| [supabase/migrations/012_user_ai_settings.sql.md](supabase/migrations/012_user_ai_settings.sql.md) | 用户 AI 设置 |

---

## ⚙️ 配置文件文档

| 文件 | 说明 |
|------|------|
| [package.json.md](package.json.md) | 依赖配置 |
| [tsconfig.json.md](tsconfig.json.md) | TypeScript 配置 |
| [next.config.ts.md](next.config.ts.md) | Next.js 配置 |
| [tailwind.config.ts.md](tailwind.config.ts.md) | Tailwind 配置 |
| [postcss.config.mjs.md](postcss.config.mjs.md) | PostCSS 配置 |
| [eslint.config.mjs.md](eslint.config.mjs.md) | ESLint 配置 |
| [middleware.ts.md](middleware.ts.md) | 中间件配置 |

---

## 🔧 脚本文档

| 文件 | 说明 |
|------|------|
| [scripts/run-migration.mjs.md](scripts/run-migration.mjs.md) | 迁移脚本 |
| [scripts/test-ai-quality.ts.md](scripts/test-ai-quality.ts.md) | AI 质量测试 |
| [scripts/test-bilibili.ts.md](scripts/test-bilibili.ts.md) | B站测试 |
| [scripts/test-prompts.mjs.md](scripts/test-prompts.mjs.md) | Prompt 测试 |

---

## 📝 类型定义

| 文件 | 说明 |
|------|------|
| [types/youtube-iframe.d.ts.md](types/youtube-iframe.d.ts.md) | YouTube Iframe 类型 |

---

## 📊 文档统计

| 类别 | 数量 |
|------|------|
| 项目文档 | 9 |
| AI 相关文档 | 7 |
| API 端点文档 | 28 |
| 核心库文档 | 42 |
| 前端组件文档 | 38 |
| 数据库文档 | 11 |
| 配置文件文档 | 11 |
| 脚本文档 | 4 |
| 类型定义 | 1 |
| **总计** | **151** |
