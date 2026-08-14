# supabase/migrations/010_subscription_tiers.sql

## 文件路径
`supabase/migrations/010_subscription_tiers.sql`

## 功能摘要
扩展订阅档位。

## 关键实现细节
1. 添加 max 档位到 profiles 表的 subscription_tier 约束

## 依赖关系
- PostgreSQL

## 关联的功能模块
- 订阅系统