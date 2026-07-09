# supabase/migrations/003_moments_summary.sql

## 文件路径
`supabase/migrations/003_moments_summary.sql`

## 功能摘要
AI 结果缓存表创建。

## 关键实现细节
1. 创建 ai_results_cache 表
2. 存储要点时刻和结构化摘要
3. 按 (video_id, result_type, language, mode, theme) 去重
4. 启用 RLS 和创建索引

## 依赖关系
- PostgreSQL

## 关联的功能模块
- AI 分析缓存