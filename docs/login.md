# app/login/page.tsx

**文件路径**：`app/login/page.tsx`

**功能摘要**：登录页面，使用 Supabase Auth 进行邮箱/密码登录。

## 关键实现细节

- **组件类型**：客户端组件
- **认证方式**：`supabase.auth.signInWithPassword({ email, password })`

### UI 结构
1. Logo + 品牌名
2. 卡片式登录表单
   - 邮箱输入框
   - 密码输入框
   - 错误提示
   - 登录按钮
3. 注册链接

### 流程
1. 填写邮箱和密码
2. 调用 Supabase 登录
3. 成功 → 重定向到首页并刷新
4. 失败 → 显示错误信息

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/navigation` | useRouter |
| `next/image` | Logo |
| `next/link` | 路由链接 |
| `lucide-react` | 图标 |
| `@/lib/supabase/client` | Supabase 客户端 |
| `@/components/ui/*` | UI 组件（Button, Input, Card） |

## 关联功能模块

- 注册页面 `/register`
- 认证回调 `/auth/callback`
