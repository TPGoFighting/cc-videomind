# app/api/payment/submit/route.ts

**文件路径**：`app/api/payment/submit/route.ts`

**功能摘要**：用户提交付款凭证（微信/支付宝交易单号），供管理员审核。

## 关键实现细节

### GET — 查询待审核状态
- 查询当前用户是否有 `status=pending` 的提交

### POST — 提交付款凭证
- **安全配置**：限流 20 次/分钟，scope 为 `payment-submit`
- **参数**（SubmitSchema）：
  - `tier`：`"pro"` | `"max"`
  - `transactionId`：交易单号，1-100 字符
- **防重复**：检查是否已有相同 tier 的 pending 提交

### 返回值
```json
// GET
{ "pending": { "tier", "status", "createdAt" } | null }

// POST
{ "ok": true }
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/server` | Supabase Service Client |
| `@/lib/security/middleware` | 安全中间件 |

## 关联功能模块

- 订阅页面 `/subscribe`
- 管理员付款审核 `/api/admin/payments`
