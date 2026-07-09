# lib/bilibili/transcript-provider.ts

## 文件路径

`lib/bilibili/transcript-provider.ts`

## 功能摘要

Bilibili 字幕提取 Provider，支持软字幕（JSON 格式）和硬转写（ASR 语音识别）两条链路，集成流式进度回调。

## 关键实现细节

### 类型定义

- **`BilibiliSubtitleItem`** — B站字幕 JSON 条目：`{ from, to, content }`。
- **`BilibiliSubtitleJson`** — B站字幕文件结构：`{ body: BilibiliSubtitleItem[] }`。

### 类

- **`BilibiliTranscriptProvider`** — 实现 `TranscriptProvider` 接口：

#### 主流程 `getTranscript()`
1. 调用 `fetchBilibiliMetadata()` 获取视频基本信息（含 CID）。
2. 通过 `onProgress` 回调推送进度事件：`metadata` → `soft_subtitle` / `asr_start` → `asr_chunk` → `complete`。
3. 重新请求 view 接口提取字幕轨道列表。
4. 软字幕存在时，按优先级匹配下载。
5. 软字幕为空或下载失败时，启动 ASR 兜底链路。

#### 轨道排序 `rankBilibiliTracks()`
优先级：手动英文 → 自动英文 → 手动中文 → 自动中文 → 其余手动 → 其余自动。
AI 字幕判断依据：`lan` 以 `ai-` 开头、`ai_status === 2`、`ai_type === 1`。

#### 软字幕下载 `downloadAndParseSubtitle()`
- 下载 B站 JSON 格式字幕文件。
- 解析 `{ from, to, content }` 条目，复用 `cleanCaptionText` 清理文本。
- 通过 `mergeIntoSentences()` 合并句子。

#### ASR 兜底 `transcribeAudioStream()`
1. 请求 `playurl` API（`fnval=16` 获取 Dash 格式）获取音频流地址。
2. 下载音频流（25 秒超时）。
3. 调用 OpenAI 兼容 ASR API（默认 SiliconFlow）进行语音转写：
   - 支持 3 次重试，间隔 2s/4s。
   - 优先使用标准 `segments`（带时间戳）。
   - 兜底使用纯文本比例分句算法。

#### 比例分句 `splitTextIntoProportionalSegments()`
- 一级分句：按中英文主要标点（`。！？；.!?\n` 等）切分。
- 二级细化：超过 35 字符的句子按逗号继续切分。
- 时间戳分配：按文本长度比例均匀分配总时长。

## 依赖关系

### import

| 模块 | 用途 |
|------|------|
| `@/lib/types` | `TranscriptSegment` 类型 |
| `@/lib/utils/http` | `fetchJsonWithTimeout`、`fetchWithTimeout` |
| `lib/youtube/transcript-provider` | `cleanCaptionText`、`isRecord`、`mergeIntoSentences`、`TranscriptProvider` |
| `lib/bilibili/metadata` | `fetchBilibiliMetadata` |
| `lib/bilibili/risk-manager` | `BilibiliAntiRiskManager` |

### 被谁 import

- API 路由层调用以提取 B站视频字幕。

## 关联的功能模块

- `lib/bilibili/metadata.ts` — 获取视频元数据和 CID。
- `lib/bilibili/risk-manager.ts` — 防风控 headers。
- `lib/youtube/transcript-provider.ts` — 复用字幕处理工具函数。
