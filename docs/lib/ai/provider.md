# lib/ai/provider.ts

## 文件路径

`lib/ai/provider.ts`

## 功能摘要

AI 服务提供者核心模块，定义了 `AiProvider` 接口及两个具体实现（OpenAI 兼容、Gemini），负责视频分析、问答、关键片段提取、结构化摘要、词义定义和转录翻译等 AI 任务的调度与执行。

## 关键实现细节

### 接口

- **`AiProvider`** — 统一的 AI 调用接口，包含 `generateAnalysis`、`answerQuestion`、`generateKeyMoments`、`generateStructuredSummary`、`defineWords`、`translateTranscript` 六个方法。

### 类

- **`OpenAiCompatibleProvider`** — 支持 OpenAI 兼容 API（包括 DeepSeek 等），具备多模型 fallback 链：
  - `chatJson()` 先尝试带 `response_format: json_object`，失败后降级不带格式，再失败切换下一个备选模型。
  - `tryChat()` 封装了 HTTP 调用，错误统一返回 `null` 而非抛出，让 fallback 链继续。
  - DeepSeek 域名自动标准化为 `https://api.deepseek.com`。
- **`GeminiProvider`** — 调用 Google Gemini API（`generativelanguage.googleapis.com`），使用 `generationConfig.responseMimeType` 获取 JSON 输出。

### 关键函数

- **`getAiProvider(userId?)`** — 工厂函数，根据配置（环境变量 > 用户配置 > 全局 app_settings）创建对应 Provider 实例。
- **`getResolvedConfig(userId?)`** — 三级配置优先级合并：环境变量 > 用户个人配置 > 全局数据库配置。
- **`clearAiProviderCache()`** — 清除全局和 per-user 配置缓存。
- **`runConcurrent(concurrency, items, fn)`** — 并发限制执行器，保持结果顺序。
- **`parseJsonContent(content)`** — 从 AI 响应中提取 JSON，支持直接解析、大括号计数法提取、修复常见问题后重试。
- **`repairAnalysis()`** — 当 Zod 校验失败时，尝试宽松字段名匹配修复 VideoAnalysis 输出。
- **`fillDebug()`** — 填充 GenerationDebug 调试信息。

### 并发策略

- `generateKeyMoments` 的 Fast 模式：将字幕按 5 分钟切片（45s 重叠），最多 3 并发调用 AI，再通过 reduce prompt 归并候选。
- `defineWords` 按 30 词/批，最多 3 并发。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `zod` | 运行时类型校验 |
| `@/lib/types` | 类型定义和 Schema（VideoAnalysis、ChatAnswer、KeyMoment 等） |
| `@/lib/ai/prompts` | 构建分析和聊天 prompt |
| `@/lib/ai/prompts-v2` | 构建关键片段 prompt |
| `@/lib/ai/prompts-learn` | 构建词义定义和翻译 prompt |
| `@/lib/utils/http` | HTTP 请求工具 |
| `@/lib/utils/chunk` | 字幕切片 |
| `@/lib/utils/json` | JSON 提取与修复 |
| `@/lib/utils/moments-validator` | 关键片段校验去重 |
| `@/lib/supabase/admin` | 数据库配置（动态导入） |
| `@/lib/ai/provider-registry` | 模型 fallback 链（动态导入） |

### 被谁 import

`getAiProvider` 和 `clearAiProviderCache` 是对外暴露的主要 API，被 API 路由和业务层调用。

## 关联的功能模块

- `lib/ai/prompts.ts` / `lib/ai/prompts-v2.ts` / `lib/ai/prompts-learn.ts` — Prompt 构建
- `lib/ai/provider-registry.ts` — 模型 fallback 管理
- `lib/utils/http` / `lib/utils/chunk` / `lib/utils/json` — 基础工具
- `lib/utils/moments-validator` — 关键片段校验
- `lib/types` — 全局类型定义
