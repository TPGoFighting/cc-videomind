# app/auth/callback/route.ts

**文件路径**：`app/auth/callback/route.ts`

**功能摘要**：OAuth 登录回调处理，交换授权码为会话并重定向。

## 关键实现细节

- **HTTP 方法**：GET
- **查询参数**：
  - `code`：OAuth 授权码
  - `next`：重定向目标路径（默认 `/`）

### 处理流程
1. 获取 URL 参数
2. 若有 `code`，调用 `supabase.auth.exchangeCodeForSession(code)` 交换会话
3. 重定向到 `next` 路径

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/server` | NextRequest / NextResponse |
| `@/lib/supabase/server` | Supabase Server Client |

## 关联功能模块

- 登录/注册页面
- Supabase Auth
