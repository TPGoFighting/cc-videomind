# app/api/video-analysis/upload/route.ts

**文件路径**：`app/api/video-analysis/upload/route.ts`

**功能摘要**：处理本地视频文件上传，通过 ASR（SiliconFlow SenseVoice）进行语音转录，再进行 AI 分析。支持 mp4 等格式。

## 关键实现细节

- **HTTP 方法**：POST
- **最大执行时间**：300 秒
- **安全配置**：跳过 body size 检查（`skipBodySize: true`），限流 8 次/分钟，scope 为 `video-analysis-upload`

### 请求参数（FormData）
- `file`：视频/音频文件（必填）
- `duration`：视频时长（秒，可选，默认 60）
- `title`：视频标题（可选，默认使用文件名）

### 处理流程
1. **配额检查**：匿名用户限 1 条
2. **文件保存**：将上传文件写入 `uploads/` 目录
3. **ASR 转录**：调用 SiliconFlow API（`FunAudioLLM/SenseVoiceSmall` 模型）
4. **文本分段**：`splitTextIntoProportionalSegments` 按句号/逗号等标点分段，按字数比例分配时间
5. **自动翻译**：检测语言并分批翻译（每批 30 句）
6. **AI 分析**：生成结构化分析
7. **缓存写入**：持久化到 Supabase

### 关键函数
- `cleanCaptionText(text)`：清理转录文本（去掉 `\n`、多余空格）
- `splitTextIntoProportionalSegments(text, totalDuration)`：将纯文本按时长比例切分为带时间戳的段落

### ASR API 配置
- 基础 URL：`ASR_API_BASE_URL`（默认 `https://api.siliconflow.cn/v1`）
- 模型：`ASR_MODEL`（默认 `FunAudioLLM/SenseVoiceSmall`）
- API Key：`ASR_API_KEY`

### 返回值
```json
{
  "videoId": "local-xxxxxxxx",
  "metadata": { "videoId", "title", "authorName": "本地导入", "thumbnailUrl", "providerUrl" },
  "transcript": [{ "startTime", "endTime", "text" }],
  "analysis": {},
  "cached": false,
  "preview": true/false
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `fs` / `path` | 文件系统操作 |
| `@/lib/ai/provider` | AI 分析与翻译 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/cache` | 缓存写入 |
| `@/lib/supabase/quota` | 配额管理 |
| `@/lib/types` | TranscriptSegment 类型 |

## 关联功能模块

- 视频流播放 `/api/video-stream`
- 视频分析主接口 `/api/video-analysis`
