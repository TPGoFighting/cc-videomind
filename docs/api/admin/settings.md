# app/api/admin/settings/route.ts

**文件路径**：`app/api/admin/settings/route.ts`

**功能摘要**：管理员 AI 配置管理 API，支持查看和更新全局/个人 AI 提供商配置。

## 关键实现细节

### GET — 查看配置
- 管理员可查看全局 + 个人配置，可通过 `targetUserId` 查看指定用户
- 非管理员仅查看个人配置，API Key 脱敏显示

### PUT — 更新配置
- **安全配置**：限流 60 次/分钟，scope 为 `admin-settings`
- **参数**（UpdateSchema）：
  - `scope`：`"global"` | `"personal"`（默认 global）
  - `key`：`ai_provider` | `ai_api_key` | `ai_api_base_url` | `ai_model`
  - `value`：配置值
  - `targetUserId`：目标用户（可选，personal 时使用）
- **流程**：
  - global → 写入 `app_settings`
  - personal → 写入 `user_ai_settings`
  - 写入后清除 AI Provider 缓存

### 支持的 AI 提供商
- **DeepSeek**：`deepseek-v4-flash`
- **OpenAI 兼容**：`gpt-4o`
- **Google Gemini**：`gemini-2.5-flash`
- **自定义**：支持自定义 provider ID

### 返回值
```json
// GET
{
  "admin": true,
  "global": { "ai_provider", "ai_api_key", "ai_api_base_url", "ai_model" },
  "personal": { ... },
  "providers": [{ "id", "displayName", "defaultBaseUrl", "defaultModel" }]
}

// PUT
{ "ok": true, "key": "ai_model", "scope": "global" }
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/admin` | 配置管理函数 |
| `@/lib/ai/provider` | 清除 AI 缓存 |
| `@/lib/security/middleware` | 安全中间件 |

## 关联功能模块

- 设置页面 `/settings`
- AI 连接测试 `/api/admin/settings/test`
- AI 服务提供者
