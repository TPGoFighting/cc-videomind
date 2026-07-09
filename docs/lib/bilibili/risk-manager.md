# lib/bilibili/risk-manager.ts

## 文件路径

`lib/bilibili/risk-manager.ts`

## 功能摘要

Bilibili API 风控管理器，实现 Cookie 池轮询、防爬 headers 注入和元数据内存缓存，防止高频请求触发 B站风控。

## 关键实现细节

### 类型

- **`CacheEntry<T>`** — 缓存条目：`{ data: T, expiry: number }`。

### 类

- **`BilibiliAntiRiskManager`** — 单例模式风控管理器：

#### 构造
- 私有构造函数，从 `BILI_SESSDATA_POOL` 环境变量加载 Cookie 池（逗号分隔）。

#### 方法

- **`getInstance()`** — 静态工厂方法，获取全局单例。
- **`getHeaders()`** — 轮询获取下一个请求 Headers：
  - 固定 `User-Agent`（Chrome 浏览器 UA）和 `Referer: https://www.bilibili.com`。
  - 从 Cookie 池中轮询注入 `SESSDATA` Cookie（环形轮询）。
- **`getMetadata(videoId)`** — 获取缓存的元数据（10 分钟 TTL），未命中或过期返回 `null`。
- **`setMetadata(videoId, data)`** — 写入元数据缓存。

#### Cookie 池

- 从 `BILI_SESSDATA_POOL` 环境变量读取，支持多个 Cookie 轮询使用。
- 每次请求使用不同的 Cookie，降低单个 Cookie 被封禁的风险。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `@/lib/types` | `VideoMetadata` 类型 |

### 被谁 import

- `lib/bilibili/metadata.ts` — 导入 `BilibiliAntiRiskManager` 获取 headers 和缓存。
- `lib/bilibili/transcript-provider.ts` — 导入 `BilibiliAntiRiskManager` 获取 headers 用于字幕和音频流下载。

## 关联的功能模块

- `lib/bilibili/metadata.ts` — 元数据获取，使用风控 headers 和缓存。
- `lib/bilibili/transcript-provider.ts` — 字幕和音频流下载，使用风控 headers。
