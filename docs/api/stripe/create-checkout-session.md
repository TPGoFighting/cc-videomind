# app/api/stripe/create-checkout-session/route.ts

**文件路径**：`app/api/stripe/create-checkout-session/route.ts`

**功能摘要**：创建 Stripe Checkout Session，用于订阅 Pro/Max 方案。

## 关键实现细节

- **HTTP 方法**：POST
- **安全配置**：限流 5 次/分钟，scope 为 `stripe-checkout`

### 请求参数（Zod Schema）
- `tier`：`"pro"` | `"max"`（默认 `"pro"`）
- `successUrl`：支付成功跳转 URL（可选，需通过白名单校验）
- `cancelUrl`：取消跳转 URL（可选）

### URL 白名单校验
- 允许 `teachplayer:` 协议（App 内跳转）
- HTTP/HTTPS 仅允许与应用同源

### 处理流程
1. 校验用户已登录
2. 从环境变量获取对应 tier 的 Price ID
3. 调用 `getStripe().checkout.sessions.create()` 创建会话
4. 返回会话 URL

### 返回值
```json
{ "url": "https://checkout.stripe.com/..." }
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/stripe/server` | Stripe 初始化 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/utils/api` | 响应工具 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/plans` | 订阅方案类型 |

## 关联功能模块

- Stripe Webhook `/api/webhooks/stripe`
- 订阅页面 `/subscribe`
