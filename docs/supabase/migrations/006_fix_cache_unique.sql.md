# supabase/migrations/006_fix_cache_unique.sql

## 文件路径
`supabase/migrations/006_fix_cache_unique.sql`

## 功能摘要
修复 ai_results_cache 重复行问题。

## 关键实现细节
1. 清理重复行（保留最新记录）
2. 将 moments 类型的 theme=NULL 替换为 ''

## 依赖关系
- PostgreSQL

## 关联的功能模块
- AI 分析缓存