# open-next.config.ts

## 文件路径
`open-next.config.ts`

## 功能摘要
OpenNext Cloudflare 配置文件。

## 关键实现细节
1. 使用 `defineCloudflareConfig` 定义配置
2. 可选启用 R2 增量缓存（当前未启用）

## 依赖关系
- @opennextjs/cloudflare

## 关联的功能模块
- Cloudflare Workers 部署