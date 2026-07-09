# app/register/page.tsx

**文件路径**：`app/register/page.tsx`

**功能摘要**：注册页面，使用 Supabase Auth 进行新用户注册。

## 关键实现细节

- **组件类型**：客户端组件
- **认证方式**：`supabase.auth.signUp({ email, password })`

### 表单验证
- 密码长度 ≥ 8 位
- 两次密码输入一致

### UI 结构
1. Logo + 品牌名
2. 卡片式注册表单
   - 邮箱输入框
   - 密码输入框（≥ 8 位）
   - 确认密码输入框
   - 错误提示
   - 注册按钮
3. 登录链接

### 流程
1. 填写表单并验证
2. 调用 Supabase 注册
3. 成功 → 显示验证邮件提示，可跳转登录页
4. 失败 → 显示错误信息

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/navigation` | useRouter |
| `next/image` | Logo |
| `next/link` | 路由链接 |
| `lucide-react` | 图标 |
| `@/lib/supabase/client` | Supabase 客户端 |
| `@/components/ui/*` | UI 组件 |

## 关联功能模块

- 登录页面 `/login`
- 认证回调 `/auth/callback`
