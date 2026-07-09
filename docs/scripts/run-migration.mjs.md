# scripts/run-migration.mjs

## 文件路径
`scripts/run-migration.mjs`

## 功能摘要
执行 Supabase 数据库迁移的脚本。

## 关键实现细节
1. 读取 SQL 文件并执行迁移
2. 使用 Supabase Management API 执行 SQL
3. 需要设置 SUPABASE_ACCESS_TOKEN 环境变量
4. 支持验证表结构

## 依赖关系
- node:fs - 读取文件
- dotenv - 加载环境变量

## 关联的功能模块
- 数据库迁移