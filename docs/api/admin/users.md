# app/api/admin/users/route.ts

**文件路径**：`app/api/admin/users/route.ts`

**功能摘要**：管理员通过邮箱查找用户。

## 关键实现细节

- **HTTP 方法**：GET
- **认证**：仅管理员
- **查询参数**：`email`（必填）
- **限制**：最多返回 5 条匹配结果

### 返回值
```json
{ "users": [{ "id": "string", "email": "string" }] }
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/admin` | 管理员权限检查 |
| `@/lib/supabase/server` | Supabase Service Client |

## 关联功能模块

- 设置页面管理员查找用户
- 管理员个人配置管理
