# app/api/me/route.ts

**文件路径**：`app/api/me/route.ts`

**功能摘要**：获取当前登录用户的基本信息（角色、邮箱、订阅等级）。

## 关键实现细节

- **HTTP 方法**：GET
- **认证**：可选（未登录返回 `authenticated: false`）
- **管理员自动提升**：若用户邮箱匹配管理员条件，自动调用 `promoteToAdminIfEligible`

### 返回值
```json
{
  "role": "user" | "admin" | null,
  "email": "string" | null,
  "subscription_tier": "free" | "pro" | "max",
  "authenticated": true | false
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/server` | NextResponse |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/server` | Supabase Client |
| `@/lib/supabase/admin` | 管理员提升逻辑 |

## 关联功能模块

- 客户端认证上下文 `AuthProvider`
- 设置页面 `/settings`
- 管理员功能
