# lib/youtube/metadata.ts

## 文件路径

`lib/youtube/metadata.ts`

## 功能摘要

通过 YouTube oEmbed API 获取视频元数据（标题、作者、缩略图），支持主备双 API 回退。

## 关键实现细节

### 常量

- **`YouTubeOEmbedSchema`** — Zod 校验 oEmbed 响应：`{ title, author_name?, thumbnail_url?, provider_url? }`。

### 函数

- **`fetchYouTubeMetadata(videoId)`** — 获取 YouTube 视频元数据：
  1. 先调用 YouTube 官方 oEmbed API（`youtube.com/oembed`），超时 8 秒。
  2. 失败后回退到 noembed.com（`noembed.com/embed`），超时 12 秒。
  3. 返回标准化的 `VideoMetadata` 对象（包含 videoId、title、authorName、thumbnailUrl、providerUrl）。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `zod` | 响应数据校验 |
| `@/lib/types` | `VideoMetadata` 类型和 `VideoMetadataSchema` |
| `@/lib/utils/http` | `fetchJsonWithTimeout` |
| `lib/youtube/id` | `buildYouTubeWatchUrl` |

### 被谁 import

- API 路由层调用 `fetchYouTubeMetadata` 获取视频信息。

## 关联的功能模块

- `lib/youtube/id.ts` — 构建视频 URL。
- `lib/types` — 类型定义。
- `lib/bilibili/metadata.ts` — Bilibili 元数据获取（功能对应）。
