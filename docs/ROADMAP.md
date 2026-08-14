---
title: 架构演进目标文档
tags:
  - cc-videomind
  - architecture
  - roadmap
date: 2026-07-09
status: draft
---

# cc-videomind 架构演进目标文档

> 本文档记录所有待实施的架构改进。按模块组织，每个目标包含：问题描述、方案、实施步骤、依赖关系、验收标准。
>
> 原则：不重写现有架构，在现有代码上增量演进。

---

## 一、Chat 模块：RAG 语义检索

### 问题

当前 chat 用 head-mid-tail 随机采样 60K 字符（≈15K token），两小时视频丢失 90%+ 内容。用户问视频后半段的问题必然幻觉。引用（citations）在截断文本上匹配，经常错位。

### 目标架构

```
Question → Embedding → Vector Search → Top-K Chunks → LLM
```

### 实施步骤

#### 阶段 1：字幕向量化管线（离线）

1. **创建向量化服务** `lib/embedding/vectorizer.ts`
   - 输入：`TranscriptSegment[]`
   - 分块策略：按语义段落分块（每块 3-5 段，重叠 1 段），每块约 200-400 token
   - 调用 Embedding API（推荐 `text-embedding-3-small` 或 `gemini-embedding-001`，成本低）
   - 输出：`ChunkEmbedding { chunkId, segmentRange, text, embedding, videoId }`

2. **创建向量存储** `lib/embedding/vector-store.ts`
   - 短期方案：Supabase pgvector 扩展（`extensions/pgvector`）
   - 表结构：`video_chunks (id, video_id, chunk_index, segment_start, segment_end, text, embedding vector(1536), created_at)`
   - 索引：`CREATE INDEX ON video_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`
   - 长期方案：如规模增长，可迁移到 Qdrant / Weaviate

3. **向量化触发时机**
   - `/api/transcript` 返回字幕后，异步触发向量化（不阻塞 HTTP 响应）
   - 或 `/api/analyze` 完成后触发
   - 写入 Supabase `video_chunks` 表

#### 阶段 2：检索层

4. **创建检索服务** `lib/embedding/retriever.ts`
   - `retrieveRelevantChunks(videoId, question, topK=5)`
   - 流程：
     1. 对 question 做 Embedding
     2. 在 `video_chunks` 中做余弦相似度搜索（pgvector `<=>` 操作符）
     3. 返回 Top-K chunks（含 segmentRange 和 text）

5. **Rerank（可选增强）**
   - 用 Cohere Rerank 或交叉编码器对 Top-K 重排序
   - 成本低但效果提升明显，作为阶段 2 优化

#### 阶段 3：改造 chat 路由

6. **改造 `/api/chat` 路由**
   - 现有：`transcript.slice(0, maxChars)` → prompt
   - 新：`retrieveRelevantChunks(videoId, question)` → prompt（仅包含 Top-K 相关片段）
   - 引用：直接使用 chunk 的 `segmentRange`，不再做文本匹配

7. **改造 Prompt**
   - 现有 prompt 里拼接整段字幕
   - 新 prompt：只拼接检索到的 K 个片段，每个片段标注 chunk_id 和 segment_range
   - 引用格式：直接返回 `segmentStart` / `segmentEnd`，无需 fuzzy match

### 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/embedding/vectorizer.ts` | 新建 | 字幕分块 + 向量化 |
| `lib/embedding/vector-store.ts` | 新建 | Supabase pgvector 存储层 |
| `lib/embedding/retriever.ts` | 新建 | 语义检索服务 |
| `lib/embedding/chunker.ts` | 新建 | 语义分块逻辑 |
| `app/api/chat/route.ts` | 改造 | 用检索结果替代随机采样 |
| `lib/ai/prompts.ts` | 改造 | chat prompt 改为接收 K 个片段 |
| `supabase/migrations/013_vector_chunks.sql` | 新建 | pgvector 表结构 |
| `app/api/transcript/route.ts` | 微调 | 触发异步向量化 |

### 验收标准

- [ ] 2 小时视频的 chat 能准确回答视频后半段的问题
- [ ] 引用（citations）时间戳准确，不张冠李戴
- [ ] 向量化延迟不影响 `/api/transcript` 响应时间（异步）
- [ ] 检索延迟 <500ms（pgvector Top-5）

---

## 二、摘要模块：一次生成，缓存拆解

### 问题

当前 `/api/analyze`、`/api/generate-moments`、`/api/generate-summary` 三个 API 各自独立调用 AI，同一个视频触发 3 次 AI 调用（实际上可以 1 次完成），浪费 token 和时间。

### 目标架构

```
/api/analyze (Orchestrator)
  └─ 单次 AI 调用: comprehensive prompt → { summary, moments, takeaways, highlights }
       └─ 存入 ai_results_cache (完整 JSON)
            ├─ /api/analyze    → 读取 analysis 字段
            ├─ /api/generate-moments → 读取 moments 字段
            └─ /api/generate-summary → 读取 takeaways 字段
```

### 实施步骤

#### 阶段 1：合并 prompt

1. **创建综合 prompt** `lib/ai/prompts-comprehensive.ts`
   - 输入：title + transcript（精简版，去时间戳）
   - 输出 schema：
     ```json
     {
       "summary": "string (3-5 句话的视频概要)",
       "takeaways": [{ "label", "label_zh", "insight", "insight_zh", "timestamps": [] }],
       "moments": [{ "title", "title_zh", "timestamp", "quote", "quote_zh", "reason", "reason_zh" }],
       "highlights": [{ "startTime", "endTime", "title", "quote", "reason" }],
       "suggestedQuestions": ["string"]
     }
     ```
   - 核心原则：一次生成所有内容，确保各部分一致性

#### 阶段 2：改造 /api/analyze 为 orchestrator

2. **改造 `/api/analyze/route.ts`**
   - 调用综合 prompt 生成完整结果
   - 存入 `ai_results_cache` 表（`result_type: "comprehensive"`）
   - 返回完整结果给前端

3. **改造 `/api/generate-moments/route.ts`**
   - 优先读取 `ai_results_cache` 中的 `comprehensive` 结果
   - 如果有，直接返回 `moments` 字段
   - 如果没有（旧数据兼容），走现有逻辑

4. **改造 `/api/generate-summary/route.ts`**
   - 同上，读取 `comprehensive` 结果的 `takeaways` 字段

#### 阶段 3：前端并行请求优化

5. **改造前端 `video-workspace.tsx`**
   - 现有：Step 1 transcript → Step 2 analyze + moments + summary (3 个并行)
   - 新：Step 1 transcript → Step 2 analyze (1 个请求) → 从返回结果直接拆出 moments/summary
   - 如果 analyze 返回了 comprehensive 结果，moments/summary 不需要再请求

### 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/ai/prompts-comprehensive.ts` | 新建 | 综合 prompt |
| `app/api/analyze/route.ts` | 改造 | 成为 orchestrator |
| `app/api/generate-moments/route.ts` | 改造 | 优先读 comprehensive 缓存 |
| `app/api/generate-summary/route.ts` | 改造 | 优先读 comprehensive 缓存 |
| `lib/supabase/cache-v2.ts` | 微调 | 支持 `comprehensive` result_type |
| `components/video-workspace.tsx` | 改造 | 简化 Step 2 为单次请求 |

### 验收标准

- [ ] 长视频（30 分钟+）只触发 1 次 AI 调用（analyze），而非 3 次
- [ ] /api/generate-moments 和 /api/generate-summary 能从 comprehensive 缓存读取
- [ ] 前端 moments 和 summary 内容与 analyze 一致（同源）
- [ ] 旧数据兼容：无 comprehensive 缓存时 fallback 到独立生成

---

## 三、异步任务处理

### 问题

Bilibili ASR（下载音频 + 语音识别）、长文本翻译、向量化等操作耗时长（30s-3min），阻塞 Serverless 函数，容易超时。高并发时打满实例资源。

### 目标架构

```
HTTP Request → 启动任务 → 返回 taskId → 轮询/SSE 获取结果
                                        ↓
                              后台 Worker 处理任务
```

### 实施步骤

#### 阶段 1：任务队列基础

1. **创建任务表** `supabase/migrations/014_async_tasks.sql`
   ```sql
   CREATE TABLE async_tasks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     task_type TEXT NOT NULL, -- 'bilibili_asr', 'translate', 'vectorize', 'comprehensive_analysis'
     video_id TEXT NOT NULL,
     user_id UUID,
     status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
     input JSONB,
     output JSONB,
     error TEXT,
     created_at TIMESTAMPTZ DEFAULT now(),
     started_at TIMESTAMPTZ,
     completed_at TIMESTAMPTZ
   );
   ```

2. **创建任务管理器** `lib/async/task-manager.ts`
   - `createTask(type, videoId, userId, input)` → taskId
   - `updateTask(taskId, status, output?)` 
   - `getTask(taskId)` → task status + result
   - `getTasksByVideo(videoId)` → all tasks for a video

3. **创建 Worker 路由** `app/api/worker/route.ts`
   - 被调用时拉取 pending tasks 并处理
   - 或由 Vercel Cron / 外部定时器触发

#### 阶段 2：异步化具体任务

4. **异步化 Bilibili ASR**
   - `/api/transcript` 中 Bilibili ASR 路径改为：创建任务 → 返回 taskId → 前端轮询
   - 前端：显示 "正在识别语音..." 进度

5. **异步化翻译**
   - `/api/translate-transcript` 改为：创建任务 → 返回 taskId → SSE 推送结果
   - 或保持 SSE 但任务在后台执行，HTTP 连接只负责建立 SSE channel

6. **异步化向量化**
   - `/api/transcript` 返回后，异步创建 vectorize task
   - 不阻塞 transcript 响应

### 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `supabase/migrations/014_async_tasks.sql` | 新建 | 任务表 |
| `lib/async/task-manager.ts` | 新建 | 任务 CRUD |
| `lib/async/workers/bilibili-asr.ts` | 新建 | B站 ASR worker |
| `lib/async/workers/translate.ts` | 新建 | 翻译 worker |
| `lib/async/workers/vectorize.ts` | 新建 | 向量化 worker |
| `app/api/worker/route.ts` | 新建 | Worker 触发端点 |
| `app/api/tasks/[taskId]/route.ts` | 新建 | 任务状态查询 |
| `app/api/transcript/route.ts` | 微调 | B站 ASR 异步化 |
| `app/api/translate-transcript/route.ts` | 改造 | 翻译异步化 |

### 验收标准

- [ ] Bilibili ASR 不阻塞 HTTP 请求，前端可轮询进度
- [ ] 长视频翻译（1000+ 段）不超时
- [ ] 向量化不阻塞 transcript 响应
- [ ] 任务失败可重试

---

## 四、翻译模块版本化

### 问题

当前翻译直接写入 `video_analyses.transcript` 的 `text_zh` 字段，无法回滚、无法 A/B 测试不同翻译质量、无法支持多语言版本。

### 目标架构

```
video_translations 表 (独立分表)
  ├─ video_id + language + translation_version → translated_segments
  ├─ 支持多版本共存
  └─ 前端按版本读取
```

### 实施步骤

1. **创建翻译表** `supabase/migrations/015_translation_versions.sql`
   ```sql
   CREATE TABLE video_translations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     video_id TEXT NOT NULL,
     language TEXT NOT NULL, -- 'zh', 'ja', 'ko', etc.
     version INTEGER NOT NULL DEFAULT 1,
     segments JSONB NOT NULL, -- [{ startTime, endTime, text, text_zh }]
     provider TEXT, -- 'openai', 'anthropic', 'deepseek'
     model TEXT,
     quality_score FLOAT, -- 可选：翻译质量评分
     created_at TIMESTAMPTZ DEFAULT now(),
     UNIQUE(video_id, language, version)
   );
   ```

2. **改造翻译写入逻辑**
   - `/api/translate-transcript` 完成后写入 `video_translations` 而非 `video_analyses.transcript`
   - 默认 `version = 1`
   - 重新翻译时 `version += 1`

3. **改造翻译读取逻辑**
   - `/api/chat`、`/api/analyze` 等需要中文时，从 `video_translations` 读取最新版本
   - 支持指定版本：`GET /api/translations?videoId=xxx&language=zh&version=1`

4. **前端改造**
   - `VideoWorkspace` 翻译状态改为读取 `video_translations`
   - 支持切换翻译版本（可选，后续功能）

### 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `supabase/migrations/015_translation_versions.sql` | 新建 | 翻译版本表 |
| `lib/supabase/translations.ts` | 新建 | 翻译 CRUD |
| `app/api/translate-transcript/route.ts` | 改造 | 写入新表 |
| `app/api/translations/route.ts` | 新建 | 翻译查询 API |
| `components/video-workspace.tsx` | 微调 | 读取翻译版本 |

### 验收标准

- [ ] 翻译结果存储在独立表，不污染 `video_analyses`
- [ ] 支持同一视频多语言版本
- [ ] 重新翻译时保留旧版本
- [ ] 其他模块读取翻译时无感知切换

---

## 五、单词释义前后端对齐

### 问题

需要确认前端 `useWordDefinitions` Hook 与后端 `/api/word-definitions` 的数据流完整闭环，确保：
- 前端正确触发释义请求
- 后端返回格式与前端类型匹配
- 缓存命中时前端能正确渲染
- 错误状态下前端有 fallback

### 实施步骤

1. **审查现有集成**
   - 检查 `useWordDefinitions.ts` 的 SWR key 和 fetcher
   - 检查 `video-workspace.tsx` 中 `wordDefinitions` 的使用方式
   - 确认 `TranscriptSegment` → lemmas 提取 → API 调用 → 渲染 的完整链路

2. **补充前端渲染**
   - 确保 `video-player.tsx` 或 `transcript-panel.tsx` 中有释义 tooltip/popover
   - 确保移动端 `mobile-video-tabs.tsx` 也支持释义显示

3. **错误处理**
   - API 失败时前端 fallback：显示 "释义不可用" 而非空白
   - 部分词义缺失时：显示已有的，缺失的显示原文

### 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/hooks/useWordDefinitions.ts` | 审查 | 确认类型对齐 |
| `components/video-workspace.tsx` | 审查 | 确认使用方式 |
| `components/video-player.tsx` | 可能改造 | 添加释义 tooltip |
| `components/transcript-panel.tsx` | 可能改造 | 添加释义显示 |

### 验收标准

- [ ] 视频字幕中的英文单词悬停/点击显示释义
- [ ] 移动端也能查看释义
- [ ] 释义请求失败时有明确提示
- [ ] 已缓存的释义秒加载

---

## 六、依赖关系与优先级

```
阶段 1 (无依赖，可并行):
├── 五、单词释义前后端对齐 ─────── 低风险，快速验证
├── 四、翻译模块版本化 ──────────── 中风险，独立改造
└── 一.RAG 语义检索（阶段 1）─── 新建文件，不影响现有代码

阶段 2 (依赖阶段 1):
├── 一.RAG 语义检索（阶段 2-3）── 依赖 pgvector 表
└── 三、异步任务处理（阶段 1）──── 新建文件，不影响现有代码

阶段 3 (依赖阶段 2):
├── 二、摘要模块合并 ──────────── 依赖 comprehensive prompt 设计
├── 三、异步任务处理（阶段 2）─── 依赖任务表
└── 前端集成测试
```

### 并行执行建议

| 执行组 | 可并行任务 | 预计耗时 |
|--------|-----------|----------|
| 组 A | 单词释义对齐 + 翻译版本化 + RAG 阶段 1 | 2-3 天 |
| 组 B | 异步任务基础 + comprehensive prompt | 2-3 天 |
| 组 C | RAG 阶段 2-3 + 摘要合并 + 异步 worker | 3-4 天 |
| 组 D | 前端集成 + 测试 | 2 天 |

---

## 七、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| pgvector 扩展未安装 | RAG 方案受阻 | 提前确认 Supabase 项目支持 |
| Embedding API 成本 | 向量化成本随视频数增长 | 用 `text-embedding-3-small`（$0.02/1M token），或本地模型 |
| comprehensive prompt 过长 | JSON 输出不稳定 | 分段生成 + reduce，或用 structured output |
| 任务队列实现复杂度 | 异步化引入新状态管理 | 先用简单轮询，后续再优化为 pub/sub |
| 翻译版本表迁移 | 存量数据需要迁移 | 写一次性迁移脚本，旧数据 version=1 |
