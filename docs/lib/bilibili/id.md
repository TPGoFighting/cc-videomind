# lib/bilibili/id.ts

## 文件路径

`lib/bilibili/id.ts`

## 功能摘要

Bilibili 视频 ID 提取与 URL 工具，支持 BV 号和 av 号的提取、短链接重定向解析、规范 URL 构建。

## 关键实现细节

### 常量/Schema

- **`BilibiliVideoIdSchema`** — Zod 校验：匹配 `BV` + 10 位字母数字 或 `av` + 数字。

### 函数

- **`extractBilibiliVideoId(input)`** — 从字符串中提取 Bilibili 视频 ID：
  - 直接匹配 BV 号（`BV` + 10 位字母数字）
  - 直接匹配 av 号（`av` + 数字）
  - 从 `bilibili.com/video/BVxxx` URL 路径提取
  - 从 `b23.tv/BVxxx` 短域名提取
  - URL 解析失败时降级正则模糊抓取
- **`resolveBilibiliUrl(input)`** — 解析 B站短链接（`b23.tv`）重定向：
  - 检测到 `b23.tv` 短链接时，手动跟踪 HTTP 重定向（301/302/303/307/308）
  - 6 秒超时，失败时返回原始输入
  - 注意：仅当路径不是直接 BV/av 号时才触发重定向
- **`buildBilibiliWatchUrl(videoId)`** — 构建 B站视频标准 Web URL：`https://www.bilibili.com/video/ID`。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `zod` | ID 格式校验 |
| `@/lib/utils/http` | `fetchWithTimeout`（已导入但未使用，重定向使用原生 fetch） |

### 被谁 import

- `lib/bilibili/metadata.ts` — 导入 `buildBilibiliWatchUrl` 构建元数据中的 providerUrl。

## 关联的功能模块

- `lib/bilibili/metadata.ts` — Bilibili 元数据获取。
- `lib/youtube/id.ts` — YouTube ID 提取（功能对应）。
