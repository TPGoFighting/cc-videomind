# supabase/migrations/008_quota_ip_tracking.sql

## 文件路径
`supabase/migrations/008_quota_ip_tracking.sql`

## 功能摘要
为 usage_events 添加 IP 地址追踪。

## 关键实现细节
1. 添加 ip_address 列
2. 创建索引

## 依赖关系
- PostgreSQL

## 关联的功能模块
- 用量统计