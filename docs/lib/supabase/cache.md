# lib/supabase/cache.ts

**文件路径**：`lib/supabase/cache.ts`

## 功能摘要

视频分析结果的基础缓存层，管理 `video_analyses` 表的读写，缓存视频元数据、字幕和分析结果。

## 关键实现细节

### Schema 定义
- 使用 Zod 定义 `CachedAnalysisSchema`，包含 `video_id`、`metadata`、`transcript`、`analysis` 四个字段，后三者可为 `null`。
- 复用 `lib/types` 中的 `TranscriptSegmentSchema`、`VideoAnalysisSchema`、`VideoMetadataSchema`。

### `getCachedAnalysis(videoId)`
- 从 `video_analyses` 表按 `video_id` 查询，使用 `maybeSingle()` 返回单条。
- 通过 Zod schema 校验数据格式。

### `upsertTranscriptCache({ videoId, metadata, transcript })`
- 仅缓存字幕和元数据（不含分析结果）。
- 使用 `upsert` + `onConflict: "video_id"` 实现。

### `upsertAnalysisCache({ videoId, metadata, transcript, analysis })`
- 缓存完整分析结果（元数据 + 字幕 + AI 分析）。
- 同样使用 `upsert` + `onConflict: "video_id"`。

## 依赖关系

- **外部依赖**：`zod`
- **内部依赖**：`lib/types`（Schema 和类型）、`lib/supabase/server.ts`（`createSupabaseServiceClient`）
- **数据库表**：`video_analyses`
- **被导入**：视频分析 API 路由

## 关联功能模块

- 视频分析流程（转写 → 分析 → 缓存）
- 与 `cache-v2.ts`（高级缓存）形成基础/高级两层缓存体系
