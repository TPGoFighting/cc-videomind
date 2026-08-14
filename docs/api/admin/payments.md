# app/api/admin/payments/route.ts

**文件路径**：`app/api/admin/payments/route.ts`

**功能摘要**：管理员付款审核 API，查看用户提交的付款凭证，审批或拒绝付款申请。

## 关键实现细节

### GET — 查看付款提交
- **认证**：仅管理员
- **查询参数**：`status`（`pending`/`approved`/`rejected`/`all`，默认 `pending`）
- **流程**：查询 `payment_submissions` 表，关联 `profiles` 获取用户邮箱

### PUT — 审批/拒绝付款
- **安全配置**：限流 60 次/分钟，scope 为 `admin-payments`
- **参数**（UpdateSchema）：
  - `submissionId`：提交记录 UUID
  - `action`：`"approve"` | `"reject"`
  - `notes`：管理员备注（可选，最长 500 字符）
- **流程**：
  1. 校验提交记录存在且状态为 `pending`
  2. 更新 `payment_submissions` 状态
  3. 审批通过 → 更新 `profiles.subscription_tier`
  4. 清除 AI Provider 缓存

### 返回值
```json
// GET
{ "submissions": [{ "id", "user_id", "tier", "transaction_id", "status", "admin_notes", "created_at", "userEmail" }] }

// PUT
{ "ok": true, "status": "approved" | "rejected" }
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/server` | Supabase Service Client |
| `@/lib/supabase/admin` | 管理员权限检查 |
| `@/lib/ai/provider` | 清除 AI 缓存 |
| `@/lib/security/middleware` | 安全中间件 |

## 关联功能模块

- 设置页面管理员付款审核面板
- 用户付款提交 `/api/payment/submit`
- 订阅页面 `/subscribe`
