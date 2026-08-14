# lib/utils/api.ts

## 文件路径
`lib/utils/api.ts`

## 功能摘要
提供统一的 API 响应格式和请求解析工具函数。

## 关键实现细节
1. `readJson<T>()` - 解析请求体并使用 Zod Schema 验证
   - 限制请求体大小（最大 128KB）
   - 自动处理 JSON 解析错误和 Zod 验证错误
   - 返回统一格式的错误响应

2. `successResponse<T>()` - 返回成功的 JSON 响应
   - 格式：`{ ok: true, data: T }`

3. `errorResponse()` - 返回错误的 JSON 响应
   - 格式：`{ ok: false, error: { code, message, details } }`
   - 支持自定义 HTTP 状态码

## 依赖关系
- `next/server` - NextResponse
- `zod` - ZodError, ZodSchema
- `@/lib/types` - JsonResponse 类型

## 关联的功能模块
- 所有 API 路由（统一响应格式）
- 请求验证和错误处理