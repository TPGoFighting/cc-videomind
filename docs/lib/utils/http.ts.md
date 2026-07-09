# lib/utils/http.ts

## 文件路径
`lib/utils/http.ts`

## 功能摘要
提供带超时控制的 HTTP 请求工具函数。

## 关键实现细节
1. `ExternalServiceError` - 自定义错误类
   - 包含服务名称和 HTTP 状态码

2. `fetchWithTimeout()` - 带超时的 fetch 封装
   - 默认超时时间 10 秒
   - 使用 AbortController 实现超时控制
   - 自动处理网络错误和超时错误

3. `fetchJsonWithTimeout<T>()` - 带超时的 JSON 请求
   - 自动解析响应为 JSON

## 依赖关系
- 无外部依赖

## 关联的功能模块
- 外部 API 调用（YouTube、AI、Supadata 等）