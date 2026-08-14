# supabase/migrations/004_admin_and_settings.sql

## 文件路径
`supabase/migrations/004_admin_and_settings.sql`

## 功能摘要
管理员角色和全局应用配置表。

## 关键实现细节
1. 为 profiles 表添加 role 字段
2. 创建 app_settings 表
3. 配置 RLS：所有人可读，仅 admin 可写

## 依赖关系
- PostgreSQL

## 关联的功能模块
- 管理后台