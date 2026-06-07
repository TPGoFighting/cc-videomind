# 🎬 Teach Player (VideoMind)

> **YouTube AI 学习工作区** — 粘贴 YouTube 链接，快速获取字幕、AI 摘要、时间戳要点、AI 问答和个人笔记。

📺 **演示视频：** [点击观看 Bilibili 演示](https://www.bilibili.com/video/BV1nJV36KEnV/?spm_id_from=333.1387.homepage.video_card.click)

🌐 **在线体验：** [https://video.tpgofighting.top](https://video.tpgofighting.top)

---

## ✨ 主要功能

| 功能 | 说明 |
|------|------|
| **🎯 一键解析** | 粘贴 YouTube URL 自动拉取视频元数据 + 字幕 |
| **📝 AI 摘要** | 大模型自动生成视频核心摘要和分段要点 |
| **💬 AI 对话** | 基于视频内容提问，AI 结合字幕上下文作答 |
| **📖 单词/句子收藏** | 点击字幕中的单词/句子，一键收藏到生词本或语料库 |
| **📒 个人笔记** | 每条视频独立笔记，支持 Markdown |
| **🔄 间隔复习** | SM-2 算法驱动，支持单词、句子、知识点复习 |
| **📊 学习统计** | 签到打卡、学习数据追踪 |
| **🌙 深色模式** | 全站深色主题，护眼舒适 |

---

## 🏗️ 技术栈

### 前端

| 技术 | 用途 |
|------|------|
| **Next.js (App Router)** | React 全栈框架 |
| **TypeScript** | 类型安全 |
| **Tailwind CSS** | 样式系统 |
| **shadcn/ui** | UI 组件库 |
| **Zod** | 类型定义 + 运行时校验 |

### 后端 & 数据

| 技术 | 用途 |
|------|------|
| **Supabase** | 数据库 + 认证 + RLS |
| **OpenAI Compatible API** | AI 推理（支持多种模型回退） |
| **YouTube Transcript API** | 字幕提取（Innertube → External API 回退链） |
| **Supadata API** | 字幕备选来源 |

### 部署

| 平台 | 用途 |
|------|------|
| **Vercel** | 前端 + API 路由部署 |
| **Cloudflare Workers** | 边缘运行（通过 @opennextjs/cloudflare） |
| **Supabase** | 托管数据库 + 认证服务 |

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动本地开发
npm run dev

# 类型检查
npm run typecheck

# 构建生产版本
npm run build
```

### 环境变量

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Provider（任选一组）
OPENAI_API_KEY=          # OpenAI 兼容 API
DEEPSEEK_API_KEY=        # DeepSeek
GEMINI_API_KEY=          # Google Gemini

# Supadata（字幕提取备选）
SUPADATA_API_KEY=
```

---

## 📂 项目结构

```
app/
├── api/                  # API 路由（30+ 个）
├── video/[videoId]/     # 视频工作区（核心页面）
├── review/              # SM-2 间隔复习
├── history/             # 浏览历史
├── vocabulary/          # 生词本
├── quotes/              # 句子收藏
└── notes/               # 笔记管理

lib/
├── ai/                  # AI Provider（OpenAI / Gemini / 回退链）
├── youtube/             # YouTube 集成（解析、元数据、字幕）
├── supabase/            # 数据库客户端 + 缓存
├── security/            # 安全中间件（CSRF / 限速）
└── utils/               # 工具函数

components/
├── video-workspace.tsx  # 视频工作区主组件
├── transcript-viewer.tsx# 字幕查看器
├── chat-panel.tsx       # AI 对话面板
├── notes-panel.tsx      # 笔记面板
├── word-card.tsx        # 单词卡片
└── review-flashcard.tsx # 复习闪卡
```

---

## 🧠 架构亮点

- **Provider/Adapter 模式**：AI 和 Transcript 都通过接口抽象，支持多实现切换回退
- **智能回退链**：AI 模型（deepseek → qwen → glm → kimi）、字幕提取（Innertube → External API）多层回退保障可用性
- **7 天缓存**：Supabase 缓存视频分析结果，避免重复消耗 API
- **API 安全**：每个路由统一应用方法校验 + CSRF + 限速
- **RLS 保护**：用户数据通过 Supabase Row Level Security 隔离

---

## 📱 移动端

安卓 APP 基于 Expo (React Native) 开发，代码在 [`android-app`](https://github.com/TPGoFighting/cc-videomind/tree/android-app) 分支。

---

## 📄 许可证

## 📄 许可证

MIT License
