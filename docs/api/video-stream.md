# app/api/video-stream/route.ts

**文件路径**：`app/api/video-stream/route.ts`

**功能摘要**：本地上传视频的流媒体播放 API，支持 Range 请求（断点续传）。

## 关键实现细节

- **HTTP 方法**：GET
- **查询参数**：`id` — 视频 ID（`local-xxx` 格式）

### 处理流程
1. 清理 ID（移除 `local-` 前缀，过滤非字母数字字符）
2. 检查文件是否存在（`uploads/{cleanId}.mp4`）
3. 支持 Range 请求：解析 `Range` header，返回 206 Partial Content
4. 无 Range 请求：返回完整文件

### 安全措施
- ID 清理防止路径穿越攻击
- 仅允许字母数字和 `-` `_` 字符

### 返回值
- `Content-Type: video/mp4`
- 支持 `Accept-Ranges: bytes`

## 依赖关系

| 模块 | 用途 |
|------|------|
| `fs` / `path` | 文件系统操作 |
| `stream` | Readable 流转换 |

## 关联功能模块

- 本地视频上传分析 `/api/video-analysis/upload`
- 视频工作区播放器
