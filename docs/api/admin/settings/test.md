# app/api/admin/settings/test/route.ts

**文件路径**：`app/api/admin/settings/test/route.ts`

**功能摘要**：测试 AI 连接配置，发送轻量请求验证 AI 服务是否可正常访问。

## 关键实现细节

- **HTTP 方法**：POST
- **安全配置**：限流 30 次/分钟，scope 为 `admin-settings-test`

### 请求参数（TestSchema）
- `provider`：AI 提供商 ID
- `apiKey`：API Key
- `baseUrl`：API Base URL（可选）
- `model`：模型名称

### 处理流程
1. 根据 provider 类型创建对应实例
2. 调用 `defineWords({ lemmas: ["test"] })` 发送轻量请求
3. 成功 → 返回 `{ ok: true, message: "连接成功！..." }`
4. 失败 → 返回 `{ ok: false, error: "连接失败: ..." }`

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/ai/provider` | OpenAiCompatibleProvider / GeminiProvider |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/security/middleware` | 安全中间件 |

## 关联功能模块

- 设置页面测试连接按钮
- AI 配置管理 `/api/admin/settings`
