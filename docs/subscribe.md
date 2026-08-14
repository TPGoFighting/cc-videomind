# app/subscribe/page.tsx

**文件路径**：`app/subscribe/page.tsx`

**功能摘要**：订阅页面，展示 Pro/Max 方案对比，通过微信/支付宝扫码付款并提交交易单号进行审核。

## 关键实现细节

- **组件类型**：客户端组件
- **数据获取**：调用 `/api/payment/submit` 查询待审核状态

### 方案展示
- 三列卡片：Free / Pro / Max
- 展示：价格、配额（每日/每周/总计）、特性列表
- 选中高亮、推荐/当前徽章

### 付款流程
1. 选择方案
2. 扫描微信/支付宝收款码（支持点击放大弹窗）
3. 复制交易单号
4. 粘贴到输入框
5. 提交到 `/api/payment/submit`
6. 等待管理员审核

### 状态处理
- **未登录**：提示登录/注册
- **免费方案**：无需付款
- **审核中**：显示审核等待提示
- **付费方案**：显示收款码 + 表单

### 二维码放大弹窗
- 点击收款码图片弹出全屏查看
- 支持点击外部关闭

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/link` | 路由链接 |
| `lucide-react` | 图标 |
| `@/components/auth-context` | 认证上下文 |
| `@/components/navbar` | 导航栏 |
| `@/lib/plans` | PLAN_CONFIGS 方案配置 |

## 关联功能模块

- API `/api/payment/submit`
- 管理员付款审核 `/api/admin/payments`
- Stripe Checkout（备用方案）
