# supabase/migrations/012_user_ai_settings.sql

## 文件路径
`supabase/migrations/012_user_ai_settings.sql`

## 功能摘要
用户 AI 配置覆盖表。

## 关键实现细节
1. 创建 user_ai_settings 表
2. 配置 RLS：用户只能读写自己的配置
3. 支持 per-user AI 配置覆盖

## 依赖关系
- PostgreSQL

## 关联的功能模块
- AI 配置系统