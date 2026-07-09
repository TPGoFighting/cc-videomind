# app/api/webhooks/stripe/route.ts

**文件路径**：`app/api/webhooks/stripe/route.ts`

**功能摘要**：Stripe Webhook 回调处理，接收订阅支付事件并更新用户订阅状态。

## 关键实现细节

- **HTTP 方法**：POST
- **动态**：`force-dynamic`（阻止 Next.js 解析 body，Stripe 需要原始 body 做签名验证）
- **安全配置**：跳过 CSRF 检查，body 上限 256KB

### 处理的事件类型
1. **checkout.session.completed**：支付完成
   - 从 `session.metadata` 获取 userId、priceId、tier
   - 更新 `profiles` 表的 `subscription_tier`、`stripe_customer_id`、`stripe_subscription_id`

2. **customer.subscription.updated / deleted**：订阅更新或取消
   - 根据订阅状态更新 `subscription_tier`
   - 非活跃订阅降级为 `free`

### 防重复处理
- 通过 `stripe_events` 表记录已处理的事件 ID

### Price ID 到 Tier 映射
- `STRIPE_MAX_PRICE_ID` → `"max"`
- `STRIPE_PRO_PRICE_ID` → `"pro"`
- 其他 → `"free"`

## 依赖关系

| 模块 | 用途 |
|------|------|
| `stripe` | Stripe SDK |
| `@/lib/stripe/server` | Stripe 初始化 |
| `@/lib/supabase/server` | Supabase Service Client |
| `@/lib/plans` | 订阅方案类型 |
| `@/lib/security/middleware` | 安全中间件 |

## 关联功能模块

- Stripe Checkout 创建 `/api/stripe/create-checkout-session`
- 用户订阅状态管理
