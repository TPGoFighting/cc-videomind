# lib/supabase/cache-v2.ts

**文件路径**：`lib/supabase/cache-v2.ts`

## 功能摘要

高级 AI 结果缓存层，管理 `ai_results_cache` 表，支持按语言、模式、主题等维度缓存关键时刻（Moments）和结构化摘要（Summary），带 7 天 TTL 过期机制。

## 关键实现细节

### TTL 配置
- `SUCCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000`（7 天）。
- 读取时检查 `created_at`，超期则视为缓存失效。

### Schema 定义
- `CachedMomentsSchema`：`result`（KeyMoment 数组）+ `created_at`。
- `CachedSummarySchema`：`result`（SummaryTakeaway 数组）+ `created_at`。

### `getCachedMoments(videoId, lang, mode, theme?)`
- 多维查询：`video_id` + `result_type="moments"` + `language` + `mode` + `theme`。
- 按 `created_at` 降序取最新一条。
- 过滤空结果（防止"毒缓存"），超期返回 `null`。
- 表不存在时静默降级（try-catch）。

### `upsertMomentsCache({ videoId, lang, mode, theme?, moments })`
- 不缓存空结果。
- 先删除旧记录（避免 NULL 不等导致多行共存），再插入新记录。

### `getCachedSummary(videoId, lang)`
- 查询 `result_type="structured_summary"` 的缓存。
- 同样有 TTL 检查和空结果过滤。

### `upsertSummaryCache({ videoId, lang, takeaways })`
- 先删旧记录再插入，逻辑与 Moments 一致。

## 依赖关系

- **外部依赖**：`zod`
- **内部依赖**：`lib/types`（`KeyMomentSchema`、`SummaryTakeawaySchema`）、`lib/supabase/server.ts`（`createSupabaseServiceClient`）
- **数据库表**：`ai_results_cache`
- **被导入**：关键时刻提取 API、结构化摘要 API

## 关联功能模块

- 视频关键时刻提取
- 视频结构化摘要生成
- 与 `cache.ts`（基础缓存）形成分层缓存体系
