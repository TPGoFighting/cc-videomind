# supabase/migrations/005_english_learning.sql

## 文件路径
`supabase/migrations/005_english_learning.sql`

## 功能摘要
英语学习增强功能数据库表。

## 关键实现细节
1. 创建 word_definitions 表（词义缓存）
2. 创建 user_vocabulary 表（用户生词本）
3. 创建 user_quotes 表（用户摘抄本）
4. 启用 RLS 和创建索引
5. 回收默认权限

## 依赖关系
- PostgreSQL

## 关联的功能模块
- 英语学习系统