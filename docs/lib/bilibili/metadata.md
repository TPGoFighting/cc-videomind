# lib/bilibili/metadata.ts

## 文件路径

`lib/bilibili/metadata.ts`

## 功能摘要

通过 Bilibili Web API 获取视频元数据（标题、作者、封面、描述、CID、时长），集成内存缓存和风控 headers。

## 关键实现细节

### 常量

- **`BilibiliViewApiSchema`** — Zod 校验 B站 `/x/web-interface/view` API 响应结构。

### 类型

- **`BilibiliViewData`** — 从 Schema 推导的 data 字段类型。

### 函数

- **`fetchBilibiliMetadata(videoId)`** — 获取 Bilibili 视频元数据：
  1. 先从 `BilibiliAntiRiskManager` 内存缓存获取（10 分钟 TTL）。
  2. 调用 `api.bilibili.com/x/web-interface/view` 接口：
     - 支持 `bvid` 和 `aid`（av 号）两种参数。
     - 通过 `riskManager.getHeaders()` 注入轮询 Cookie 和防爬 headers。
  3. 解析响应，构建 `VideoMetadata` 对象：
     - 封面 URL 统一补全 `https:` 协议前缀。
     - 返回扩展字段：`description`、`cid`（用于字幕/音频流请求）、`duration`。
  4. 写入内存缓存。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `zod` | API 响应校验 |
| `@/lib/types` | `VideoMetadata` 类型和 Schema |
| `@/lib/utils/http` | `fetchJsonWithTimeout` |
| `lib/bilibili/id` | `buildBilibiliWatchUrl` |
| `lib/bilibili/risk-manager` | `BilibiliAntiRiskManager` 风控管理 |

### 被谁 import

- `lib/bilibili/transcript-provider.ts` — 导入 `fetchBilibiliMetadata` 获取 CID 用于字幕提取。

## 关联的功能模块

- `lib/bilibili/id.ts` — 构建视频 URL。
- `lib/bilibili/risk-manager.ts` — 风控 headers 和缓存管理。
- `lib/bilibili/transcript-provider.ts` — 字幕提取。
- `lib/youtube/metadata.ts` — YouTube 元数据获取（功能对应）。
