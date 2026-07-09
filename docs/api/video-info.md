# app/api/video-info/route.ts

**文件路径**：`app/api/video-info/route.ts`

**功能摘要**：通过视频 URL 获取视频元数据（标题、作者、缩略图），支持 YouTube 和 Bilibili。

## 关键实现细节

- **HTTP 方法**：POST
- **安全配置**：限流 30 次/分钟，body 上限 16KB，scope 为 `video-info`

### 请求参数（Zod Schema）
- `url`：视频 URL，1-500 字符

### 处理流程
1. 判断是否为 Bilibili 链接（bilibili.com / b23.tv / BV/av 号）
2. Bilibili：还原短链 → 提取 ID → `fetchBilibiliMetadata`
3. YouTube：`extractYouTubeVideoId` → `fetchYouTubeMetadata`

### 返回值
视频元数据对象（`videoId`、`title`、`authorName`、`thumbnailUrl`、`providerUrl`）

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/youtube/id` | YouTube ID 提取 |
| `@/lib/youtube/metadata` | YouTube 元数据 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/bilibili/id` | Bilibili ID 提取 |
| `@/lib/bilibili/metadata` | Bilibili 元数据 |

## 关联功能模块

- 首页视频 URL 输入
- 视频工作区
