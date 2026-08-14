# supabase/migrations/002_videomind_existing_project_compat.sql

## 文件路径
`supabase/migrations/002_videomind_existing_project_compat.sql`

## 功能摘要
兼容已有项目的数据库迁移。

## 关键实现细节
1. 为 profiles 表添加订阅相关字段
2. 创建唯一索引
3. 创建 RLS 策略
4. 回收默认权限

## 依赖关系
- PostgreSQL

## 关联的功能模块
- 订阅系统