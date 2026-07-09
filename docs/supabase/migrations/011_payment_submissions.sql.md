# supabase/migrations/011_payment_submissions.sql

## 文件路径
`supabase/migrations/011_payment_submissions.sql`

## 功能摘要
付款凭证提交表。

## 关键实现细节
1. 创建 payment_submissions 表
2. 管理员审核用索引
3. 配置 RLS：用户只能看自己的提交

## 依赖关系
- PostgreSQL

## 关联的功能模块
- 支付系统