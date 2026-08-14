# lib/youtube/id.ts

## 文件路径

`lib/youtube/id.ts`

## 功能摘要

YouTube 视频 ID 提取与 URL 构建工具，支持从多种格式的输入（直接 ID、完整 URL、短链）中提取视频 ID。

## 关键实现细节

### 常量/Schema

- **`VideoIdSchema`** — Zod 校验：6-20 位字母数字下划线连字符，用于验证 YouTube 视频 ID 格式。

### 函数

- **`extractYouTubeVideoId(input)`** — 从字符串中提取 YouTube 视频 ID，支持：
  - 直接 ID（如 `dQw4w9WgXcQ`）
  - `youtu.be/ID` 短链
  - `youtube.com/watch?v=ID` 标准链接
  - `youtube.com/embed/ID`、`youtube.com/shorts/ID`、`youtube.com/live/ID` 嵌入格式
  - 返回 `null` 表示提取失败。
- **`buildYouTubeWatchUrl(videoId)`** — 根据视频 ID 构建标准观看 URL：`https://www.youtube.com/watch?v=ID`。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `zod` | ID 格式校验 |

### 被谁 import

- `lib/youtube/metadata.ts` — 导入 `buildYouTubeWatchUrl` 构建 oEmbed 请求 URL。

## 关联的功能模块

- `lib/youtube/metadata.ts` — YouTube 元数据获取。
- `lib/bilibili/id.ts` — Bilibili 视频 ID 提取（功能对应）。
