# supabase/migrations/007_word_review.sql

## 文件路径
`supabase/migrations/007_word_review.sql`

## 功能摘要
单词复习系统数据库表。

## 关键实现细节
1. 创建 user_word_reviews 表（复习记录）
2. 创建 user_checkins 表（每日打卡）
3. 启用 RLS 和创建索引

## 依赖关系
- PostgreSQL

## 关联的功能模块
- 间隔复习系统