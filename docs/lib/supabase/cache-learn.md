# lib/supabase/cache-learn.ts

**文件路径**：`lib/supabase/cache-learn.ts`

## 功能摘要

词义定义缓存层，管理 `word_definitions` 表，支持批量查询和批量写入单词的音标、词性、中英文释义及例句。

## 关键实现细节

### `getCachedWordDefinitions(lemmas)`
- 批量查询：使用 `in("lemma", lemmas)` 一次查询多个词形。
- 返回 `WordDefinition[]`，包含 `lemma`、`phonetic`、`partOfSpeech`、`definitionZh`、`definitionEn`、`exampleEn`、`exampleZh`。
- 字段映射：数据库蛇形命名 → 前端驼峰命名。
- 空输入直接返回空数组，不查库。

### `upsertWordDefinitions(definitions)`
- 批量写入：使用 `upsert` + `onConflict: "lemma"` + `ignoreDuplicates: false`。
- `null` 值处理：可选字段传 `null` 而非 `undefined`。
- 使用 service client 绕过 RLS。

## 依赖关系

- **内部依赖**：`lib/types`（`WordDefinition` 类型）、`lib/supabase/server.ts`（`createSupabaseServiceClient`）
- **数据库表**：`word_definitions`
- **被导入**：视频学习模块（字幕中的生词查询/缓存）

## 关联功能模块

- 视频字幕学习功能（生词提取与释义）
- 与 `cache.ts`、`cache-v2.ts` 同属缓存层，但面向不同数据域
