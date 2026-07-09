# lib/stripe/server.ts

**文件路径**：`lib/stripe/server.ts`

## 功能摘要

Stripe 支付集成的服务端工具函数，提供 Stripe 客户端初始化和应用 URL 获取。

## 关键实现细节

### `getStripe()`
- 从 `STRIPE_SECRET_KEY` 环境变量读取密钥。
- 未配置时抛出错误。
- 创建 `Stripe` 实例，指定 API 版本为 `2025-02-24.acacia`。

### `getAppUrl()`
- 返回 `NEXT_PUBLIC_APP_URL` 环境变量，兜底 `http://localhost:3000`。
- 用于构建 Stripe 回调 URL（如 Checkout Session 的 `success_url`、`cancel_url`）。

## 依赖关系

- **外部依赖**：`stripe`
- **环境变量**：`STRIPE_SECRET_KEY`、`NEXT_PUBLIC_APP_URL`
- **被导入**：支付相关 API 路由（创建 Checkout Session、Webhook 处理等）

## 关联功能模块

- 订阅计划管理（`lib/plans`）
- 支付回调/API 路由
- 用户订阅等级更新
