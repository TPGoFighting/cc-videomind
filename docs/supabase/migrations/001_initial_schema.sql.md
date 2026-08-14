# supabase/migrations/001_initial_schema.sql

## 文件路径
`supabase/migrations/001_initial_schema.sql`

## 功能摘要
初始数据库 Schema 创建。

## 关键实现细节
1. 启用 pgcrypto 扩展
2. 创建核心表：
   - profiles: 用户资料
   - video_analyses: 视频分析缓存
   - user_videos: 用户解析记录
   - user_notes: 用户笔记
   - usage_events: 用量统计
   - stripe_events: Stripe 支付事件
3. 启用 RLS（行级安全）
4. 创建 RLS 策略
5. 创建索引

## 依赖关系
- PostgreSQL

## 关联的功能模块
- 数据库系统