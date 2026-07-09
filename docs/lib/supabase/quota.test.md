# lib/supabase/quota.test.ts

**文件路径**：`lib/supabase/quota.test.ts`

## 功能摘要

`getBearerToken` 函数的单元测试，使用 Node.js 内置测试框架验证 Bearer Token 提取逻辑。

## 关键实现细节

- 测试框架：`node:test`（`describe`/`it`）+ `node:assert/strict`。
- **测试用例 1**：`Authorization: Bearer abc.def.ghi` → 返回 `"abc.def.ghi"`。
- **测试用例 2**：`Authorization: Basic abc`（非 Bearer）→ 返回 `null`。

## 依赖关系

- **测试目标**：`lib/supabase/quota.ts`（`getBearerToken`）
- **外部依赖**：`node:assert/strict`、`node:test`

## 关联功能模块

- 配额管理模块（`quota.ts`）的测试覆盖
