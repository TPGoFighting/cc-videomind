# app/api/translate-transcript/route.ts

**文件路径**：`app/api/translate-transcript/route.ts`

**功能摘要**：流式翻译视频转录文本（SSE），自动检测语言并翻译为对应目标语言，支持分批并发处理。

## 关键实现细节

- **HTTP 方法**：POST
- **最大执行时间**：300 秒
- **安全配置**：限流 3 次/分钟，body 上限 8MB，scope 为 `translate-transcript`

### 请求参数（TranslateTranscriptRequestSchema）
- `videoId`：视频 ID

### 处理流程
1. 从缓存获取转录文本
2. 自动语言检测：取前 15 句检测是否含中文
   - 中文 → 翻译为英文
   - 英文 → 翻译为中文
3. 快速路径：若所有句子已翻译，直接返回
4. 过滤未翻译句子，分批（每批 25 句），并发 3 个 worker
5. 流式推送翻译结果（SSE `text/event-stream`）
6. 翻译完成后异步回写 Supabase 缓存

### SSE 事件格式
```
data: {"type":"segment","data":{"startTime":0,"text_zh":"翻译文本"}}
data: {"type":"done","data":{"translatedCount":42}}
```

### 返回值
SSE 流响应（`Content-Type: text/event-stream`）

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/ai/provider` | AI 翻译服务 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/cache` | 转录缓存 |
| `@/lib/supabase/server` | Supabase Service Client |
| `@/lib/types` | Schema 定义 |

## 关联功能模块

- 视频工作区字幕双语显示
- 视频分析主接口中的自动翻译逻辑
