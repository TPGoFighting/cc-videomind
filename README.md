# 🎬 Teach Player (VideoMind)

> **YouTube AI 学习工作区** — 粘贴 YouTube 链接，快速获取字幕、AI 摘要、时间戳要点、AI 问答和个人笔记。

📺 **演示视频：** [点击观看 Bilibili 演示](https://www.bilibili.com/video/BV1nJV36KEnV/?spm_id_from=333.1387.homepage.video_card.click)

🌐 **在线体验：** [https://teachplayer.tpgofighting.top](https://teachplayer.tpgofighting.top)

---

## ✨ 主要功能

| 功能 | 说明 |
|------|------|
| **🎯 一键解析** | 粘贴 YouTube URL 自动拉取视频元数据 + 字幕 |
| **📝 AI 摘要** | 大模型自动生成视频核心摘要和分段要点 |
| **🔑 关键时刻** | AI 提取视频中最有价值的学习片段，双语展示 |
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
| **Next.js 16 (App Router)** | React 全栈框架 |
| **TypeScript** | 类型安全 |
| **Tailwind CSS** | 样式系统 |
| **shadcn/ui** | UI 组件库 |
| **Zod** | 类型定义 + 运行时校验 |

### 后端 & 数据

| 技术 | 用途 |
|------|------|
| **腾讯云 PostgreSQL** | 自托管数据库、视频缓存与用户学习数据 |
| **自托管认证** | 邮箱密码 + HttpOnly Cookie Session |
| **Anthropic API (LongCat)** | AI 推理（支持 thinking 块解析） |
| **YouTube Transcript API** | 字幕提取（4 层回退链） |
| **Supadata API** | 字幕备选来源 |

### 字幕提取回退链

```
1. YouTube InnerTube API (Android/Web 并发)
2. YouTube HTML 页面解析
3. youtube-transcript npm 包
4. Supadata 外部 API
```

### 部署

| 平台 | 用途 |
|------|------|
| **自建服务器** | Next.js 应用（PM2 + Nginx） |
| **Cloudflare Tunnel** | HTTPS 反向代理 |
| **腾讯云 PostgreSQL** | 独立 `teachplayer` 数据库（仅本机服务连接） |

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

# 启动生产服务
npm start
```

### 环境变量

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Tencent Cloud PostgreSQL（仅服务端）
DATABASE_URL=postgresql://teachplayer_app:<password>@127.0.0.1:5432/teachplayer
AUTH_SESSION_SECRET=<random-secret>

# AI Provider
AI_PROVIDER=anthropic
AI_API_BASE_URL=https://api.longcat.chat/anthropic
AI_API_KEY=
AI_MODEL=LongCat-2.0

# Transcript
TRANSCRIPT_PROVIDER=supadata
SUPADATA_API_KEY=

# Local media and Bilibili ASR (server only)
ASR_API_BASE_URL=https://api.siliconflow.cn/v1
ASR_API_KEY=
ASR_MODEL=FunAudioLLM/SenseVoiceSmall

# Debug
DEBUG_AI=true
```

`ASR_API_KEY` 缺失时，本地视频转录接口会返回安全的配置错误，不会使用源码回退值或向 ASR 供应商发出请求。密钥轮换步骤见 [`docs/operations/secret-rotation.md`](docs/operations/secret-rotation.md)。

---

## 📂 项目结构

```
app/
├── api/                    # API 路由（28 个）
│   ├── transcript/         # 字幕提取
│   ├── analyze/            # AI 视频分析
│   ├── word-definitions/   # 词义生成
│   ├── generate-moments/   # 关键时刻提取
│   ├── generate-summary/   # 内容摘要
│   ├── chat/               # AI 对话
│   └── translate-transcript/ # 字幕翻译 (SSE)
├── video/[videoId]/       # 视频工作区（核心页面）
├── review/                # SM-2 间隔复习
├── history/               # 浏览历史
├── vocabulary/            # 生词本
├── quotes/                # 句子收藏
└── notes/                 # 笔记管理

lib/
├── ai/                    # AI Provider（支持多模型）
│   ├── provider.ts        # Provider 核心实现
│   ├── prompts.ts         # Prompt 模板
│   └── prompts-learn.ts   # 学习功能 Prompt
├── youtube/               # YouTube 集成
│   ├── transcript-provider.ts  # 4 层字幕回退链
│   └── metadata.ts        # 元数据获取
├── bilibili/              # B站集成
├── tencent-db.ts          # 腾讯云 PostgreSQL 连接与幂等建表
├── tencent-auth.ts        # 自托管用户认证与 Cookie Session
├── security/              # 安全中间件（限速/CSRF）
└── utils/                 # 工具函数

components/
├── video-workspace.tsx    # 视频工作区主组件
├── transcript-viewer.tsx  # 字幕查看器
├── chat-panel.tsx         # AI 对话面板
├── notes-panel.tsx        # 笔记面板
├── word-card.tsx          # 单词卡片
└── review-flashcard.tsx   # 复习闪卡

docs/                      # 项目文档（151 个文件）
├── README.md              # 文档目录索引
├── AI模型API格式参考.md    # 主流 AI 模型 API 格式对比
└── 项目API格式需求.md      # 项目 AI API 需求
```

---

## 🧠 架构亮点

### 双阶段分析流程

```
用户输入 URL → /api/transcript (5-30s) → /api/analyze (30-60s)
                  ↓                           ↓
              获取字幕                    AI 分析生成
```

每个阶段独立运行，均在 Cloudflare 100s 超时限制内。

### AI Thinking 块处理

LongCat API 返回 `thinking` 内容块（推理过程），项目通过 `extractJsonFromThinking()` 智能提取 JSON：

1. 从最后一个 `` ```json `` 代码块提取
2. 通过键名模式查找（`"definitions":`, `"moments":` 等）
3. 从后向前提取最后一个完整 JSON 对象

### 性能优化

| 优化 | 效果 |
|------|------|
| InnerTube 客户端并发 | 节省 12s |
| 视频时间轮询降频 | React 渲染减少 2.5x |
| YouTube HTML 缓存 | 重复请求节省 8-12s |
| 翻译并发提升 | 从 3 提升到 5 批次 |
| AI 模型回退超时 | 从 60s 降至 30s |

### 安全机制

- **withSecurity 中间件**：统一接入方法校验 + CSRF + 请求体大小限制 + 限流
- **Durable Objects 限流**：Cloudflare 上共享计数，本地回退内存实现
- **服务端数据隔离**：所有个人数据查询强制按当前会话 `user_id` 过滤

---

## 📱 移动端

安卓 APP 基于 Expo (React Native) 开发，源码在 [`android-app`](https://github.com/TPGoFighting/cc-videomind/tree/android-app) 分支。

APK 下载：[GitHub Releases](https://github.com/TPGoFighting/cc-videomind/releases)

---

## 📚 文档

完整文档见 [`docs/README.md`](docs/README.md)，包含：

- **AI 模型 API 格式参考**：OpenAI / Anthropic / DeepSeek / LongCat 格式对比
- **项目 API 格式需求**：各功能输入/输出格式说明
- **API 端点文档**：28 个端点的请求/响应格式
- **腾讯云架构**：[自托管 PostgreSQL、认证、备份与发布指南](docs/tencent-cloud-architecture.md)
- **前端组件文档**：所有 UI 组件的使用说明

---

## 📄 许可证

MIT License
