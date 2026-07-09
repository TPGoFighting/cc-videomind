# app/settings/page.tsx

**文件路径**：`app/settings/page.tsx`

**功能摘要**：设置页面，包含账户信息、AI 配置管理（全局/个人）、管理员面板（视频列表、付款审核）。

## 关键实现细节

- **组件类型**：客户端组件

### 页面结构
1. **账户信息**：邮箱、角色（管理员/用户）
2. **快捷入口**：句子本链接
3. **退出登录**按钮
4. **全局默认配置**（仅管理员）
5. **个人 API 配置**（管理员可管理任意用户）
6. **所有用户解析视频**（管理员面板）
7. **付款审核**（管理员面板）

### AI 配置管理
- **全局配置**：所有用户默认使用的 AI 设置
- **个人配置**：优先级高于全局，可留空使用全局
- **支持的操作**：
  - 选择 AI 提供商（DeepSeek/OpenAI 兼容/Gemini/自定义）
  - 设置 API Key、Base URL、Model
  - 测试连接
  - 管理员可指定目标用户

### 管理员功能
- **视频面板**：查看全站解析视频列表
- **付款审核**：审批/拒绝用户提交的微信/支付宝付款凭证
  - 筛选器：待审核/已通过/已拒绝/全部
  - 操作：通过 → 升级用户 tier；拒绝

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/navigation` | useRouter |
| `next/image` | 图片 |
| `next/link` | 路由链接 |
| `lucide-react` | 图标 |
| `@/components/navbar` | 导航栏 |
| `@/components/auth-context` | 认证上下文 |
| `@/components/ui/*` | UI 组件 |

## 关联功能模块

- API `/api/admin/settings`、`/api/admin/videos`、`/api/admin/payments`、`/api/admin/users`
- AI 连接测试 `/api/admin/settings/test`
