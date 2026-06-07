# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product
Teach Player (VideoMind) — YouTube AI 学习工作区。用户粘贴 YouTube 链接获取转录、摘要、时间戳要点、AI 对话问答和个人笔记。

部署地址：`https://video.tpgofighting.top`，部署在 Vercel + Cloudflare Workers（通过 `@opennextjs/cloudflare`）。

## Commands
```bash
npm run dev              # 本地开发服务器（Next.js dev）
npm run build            # 生产构建
npm run typecheck        # TypeScript 类型检查（tsc --noEmit）
npm run lint             # ESLint（--max-warnings=0）
npm run test             # 运行测试（tsx --test）
npm run preview          # Cloudflare Workers 本地预览（构建 + 预览）
npm run deploy           # 部署到 Cloudflare Workers
```

## Architecture Overview

### Data Flow
1. 用户在首页 (`/`) 粘贴 YouTube URL → `POST /api/video-info` 解析 videoId → 跳转 `/video/[videoId]`
2. 视频工作区 (`/video/[videoId]`) → `GET /api/video-analysis` 获取全量数据（metadata + transcript + analysis），7 天 Supabase 缓存
3. AI 生成（摘要/要点/Chat）按需惰性生成，结果存入 `video_analyses` 缓存表
4. 用户数据（笔记/词汇/句子/复习）全部经过 RLS 保护，API 路由通过 `getAuthenticatedUserId(request)` 获取当前用户

### Directory Map
```
app/                    # Next.js App Router 页面 + API 路由
  api/                  # 30+ API 路由（video-info, video-analysis, chat, notes, review 等）
  video/[videoId]/      # 视频工作区（核心页面）
  review/               # SM-2 间隔复习
  history/ vocabulary/ quotes/ notes/  # 用户数据页面
lib/
  ai/                   # AI Provider 接口 + 两个实现（OpenAI 兼容 / Gemini）+ Prompt 模板
    provider.ts         # AiProvider 接口 + OpenAiCompatibleProvider + GeminiProvider
    provider-registry.ts # 模型回退链（deepseek-v4-flash → qwen → glm → kimi）
    prompts*.ts         # 按功能拆分：prompts.ts（分析/聊天），prompts-v2.ts（要点/摘要），prompts-learn.ts（词汇/翻译）
  youtube/              # YouTube 集成：视频ID解析、元数据获取、转录提取
    transcript-provider.ts  # TranscriptProvider 接口 + 3 层回退（Innertube → Supadata）
  supabase/             # Supabase 客户端：server.ts（SSR/Service/Anon 三客户端）、admin.ts、
                        #   cache.ts（video_analyses 7天缓存）、quota.ts（auth + 限额）
  security/             # middleware.ts（CSRF + rate limit + body size 包装器）、rate-limit.ts（内存实现）
  utils/                # 工具：api.ts（JsonResponse 统一格式）、chunk.ts（字幕切片）、
                        #   json.ts（JSON 提取/修复）、moments-validator.ts（AI 输出校验）
  hooks/                # 客户端 hooks：useWordDefinitions、useCachedFetch、useDisplayMode 等
  types.ts              # 所有 Zod Schema + 类型定义
components/
  navbar.tsx            # 全局导航栏（含用户菜单、安卓APP下载入口）
  video-workspace.tsx   # 视频工作区主组件（播放器 + 侧边栏）
  sidebar-tabs.tsx      # 桌面端侧边栏 Tab
  mobile-video-tabs.tsx # 移动端 Tab 切换
  transcript-viewer.tsx # 转录文本查看器（时间戳、单词交互、句子收藏）
  chat-panel.tsx        # AI 对话面板
  notes-panel.tsx       # 笔记面板
  word-card.tsx         # 单词卡片（hover/点击弹出）
  review-flashcard.tsx  # 复习闪卡（答题模式）
  ui/                   # shadcn/ui 基础组件
```

### Key Patterns

**Provider/Adapter 模式**：AI 和 Transcript 集成使用接口抽象，通过环境变量或数据库配置切换实现：
- `AiProvider` 接口（`lib/ai/provider.ts`）→ `OpenAiCompatibleProvider` / `GeminiProvider`
- `TranscriptProvider` 接口（`lib/youtube/transcript-provider.ts`）→ `InnertubeTranscriptProvider` → `ExternalApiTranscriptProvider`（回退链）
- AI 配置优先级：用户个人设置 > 全局 app_settings > 环境变量

**API 安全包装器**（`lib/security/middleware.ts`）：每个 API 路由通过 `withSecurity(config)` 统一应用：
1. Method check → 2. CSRF 校验 → 3. Body size 限制 → 4. Rate limit → 5. 执行 handler
大多数 API 使用 `30 req/min` 速率限制，Chat 使用 `20 req/min`。

**认证**：Supabase Auth，全局 `AuthProvider` context（`components/auth-context.tsx`）通过 `/api/me` 获取 profile 并缓存 role + subscription_tier。API 端通过 `getAuthenticatedUserId(request)` 从 Supabase session cookie 解析用户。

**数据库 RLS**：所有表启用行级安全，API 路由不应信任 client-provided userId，始终使用 Supabase server client 获取认证用户。

**AI 输出校验**：所有 AI 生成结果必须经过 Zod Schema 校验，失败时有 fallback 修复逻辑（`repairAnalysis`、`parseChatAnswer` 等）。

## Reference Docs
- `TEACH_PLAYER_SPEC.md` — 完整功能规格（页面路由、API 清单、数据库表、交互细节）
- `DESIGN.md` — Framer 风格设计系统（纯黑背景、GT Walsheim 字体、Framer Blue 强调色）

## Coding Standards
- TypeScript strict mode，禁止 `any`（除非注明原因）
- 所有 API 输入用 Zod 校验，返回 `JsonResponse<T>` 类型
- 外部 API 调用必须带超时（`fetchJsonWithTimeout`）
- Server-only 逻辑放在 `lib/` 或 API 路由中，绝不泄露到客户端
- AI prompt 放在 `lib/ai/prompts*.ts` 独立文件中

## Security
- 不信任 client-provided userId，用 `getAuthenticatedUserId(request)` 获取认证用户
- 校验 Stripe webhook 签名，添加幂等处理
- 速率限制所有昂贵的 API 路由
- 不在代码中存储原始密钥