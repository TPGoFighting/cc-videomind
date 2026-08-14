# cc-videomind 项目 API 格式需求

> 本文档说明 cc-videomind 项目对 AI API 的具体需求和当前实现。

---

## 1. 项目 AI 调用概览

cc-videomind 使用 AI 完成以下功能：

| 功能 | 端点 | AI 方法 | 输出格式 |
|------|------|---------|----------|
| 视频分析 | `/api/analyze` | `analyzeVideo()` | `VideoAnalysis` |
| 词义生成 | `/api/word-definitions` | `defineWords()` | `WordDefinition[]` |
| 关键时刻 | `/api/generate-moments` | `generateKeyMoments()` | `KeyMoment[]` |
| 内容摘要 | `/api/generate-summary` | `generateStructuredSummary()` | `SummaryTakeaway[]` |
| 对话问答 | `/api/chat` | `chatJson()` | `ChatAnswer` |
| 字幕翻译 | `/api/translate-transcript` | `translateTranscript()` | SSE 流 |

---

## 2. 当前 AI Provider 配置

### 环境变量

```env
AI_PROVIDER=anthropic
AI_API_BASE_URL=https://api.longcat.chat/anthropic
AI_API_KEY=ak_xxxxx
AI_MODEL=LongCat-2.0
```

### 调用方式

```typescript
// lib/ai/provider.ts
const provider = await getAiProvider(userId);
const result = await provider.chatJson({
  systemPrompt: "...",
  userPrompt: "...",
  schema: z.object({...}),
  temperature: 0.7,
  maxTokens: 4096
});
```

---

## 3. 各功能的输入/输出格式

### 3.1 词义生成 (`defineWords`)

**输入**：
```typescript
{
  lemmas: string[]  // 英文单词列表
}
```

**期望输出**：
```json
{
  "definitions": [
    {
      "lemma": "hello",
      "phonetic": "/həˈloʊ/",
      "partOfSpeech": "interj.",
      "definitionZh": "你好",
      "definitionEn": "used as a greeting",
      "exampleEn": "Hello, how are you?",
      "exampleZh": "你好，你好吗？"
    }
  ]
}
```

**AI Prompt 要求**：返回纯 JSON，无 markdown 包装。

### 3.2 关键时刻 (`generateKeyMoments`)

**输入**：
```typescript
{
  title: string,
  transcript: TranscriptSegment[],
  mode: "smart" | "fast",
  theme?: string,
  targetLanguage: "zh" | "en"
}
```

**期望输出**：
```json
{
  "moments": [
    {
      "title": "The Psychology of Wanting to Be Proven Wrong",
      "title_zh": "希望被打脸的心理",
      "timestamp": "04:49-05:34",
      "quote": "I would be thrilled to be proven wrong...",
      "quote_zh": "如果被证明是错的，我会很高兴...",
      "reason": "A counter-intuitive viewpoint...",
      "reason_zh": "一个反直觉的观点..."
    }
  ]
}
```

**AI Prompt 要求**：返回纯 JSON，1-5 个时刻。

### 3.3 内容摘要 (`generateStructuredSummary`)

**输入**：
```typescript
{
  title: string,
  transcript: TranscriptSegment[],
  targetLanguage: "zh" | "en"
}
```

**期望输出**：
```json
{
  "summary": "视频内容摘要...",
  "summaryZh": "视频内容摘要（中文）...",
  "takeaways": [
    {
      "insight": "Key learning point",
      "insightZh": "关键学习点（中文）",
      "timestamp": "02:30"
    }
  ],
  "suggestedQuestions": ["问题1", "问题2"]
}
```

### 3.4 对话问答 (`chatJson`)

**输入**：
```typescript
{
  systemPrompt: string,
  userPrompt: string,
  schema: ZodSchema,
  temperature?: number,
  maxTokens?: number
}
```

**期望输出**：符合 `schema` 的 JSON 对象。

---

## 4. JSON 解析需求

### 4.1 标准解析流程

```typescript
// lib/ai/provider.ts:parseJsonContent()
function parseJsonContent(content: string) {
  // 1. 直接 JSON.parse
  // 2. extractBalancedJson() 提取
  // 3. repairBrokenJson() 修复
  // 4. extractJsonFromThinking() 从 thinking 提取
}
```

### 4.2 Thinking 块处理需求

**问题**：LongCat API 返回 thinking-only 响应，JSON 嵌在推理文本中。

**当前解决方案** (`extractJsonFromThinking`)：

1. **策略1**：从最后一个 `` ```json `` 代码块提取
2. **策略2**：通过键名模式查找 (`"definitions":`, `"moments":` 等)
3. **策略3**：从后向前提取最后一个完整 JSON 对象

### 4.3 支持的 JSON 变体

| 变体 | 处理方式 |
|------|----------|
| 标准 JSON | `JSON.parse()` 直接解析 |
| 尾部逗号 | `repairBrokenJson()` 修复 |
| 代码块包装 | `extractBalancedJson()` 提取 |
| Thinking 内嵌 | `extractJsonFromThinking()` 提取 |
| 不完整 JSON | 尝试修复或丢弃 |

---

## 5. API 兼容性矩阵

| Provider | 格式 | 当前支持 | 备注 |
|----------|------|----------|------|
| OpenAI | `choices[]` | ❌ 未实现 | 需要新增 `OpenAiProvider` |
| Anthropic | `content[]` | ✅ 已实现 | 标准格式 |
| DeepSeek | `choices[]` + `reasoning_content` | ❌ 未实现 | 需要解析 `reasoning_content` |
| LongCat (Anthropic) | `content[]` (thinking-only) | ✅ 已实现 | 特殊处理 |
| LongCat (OpenAI) | `choices[]` | ❌ 未实现 | 可作为备选 |

---

## 6. 扩展建议

### 6.1 多 Provider 支持

```typescript
// lib/ai/provider.ts
type AIProvider = "openai" | "anthropic" | "deepseek" | "longcat";

function getAiProvider(userId?: string): Promise<AIProviderInstance> {
  const provider = process.env.AI_PROVIDER as AIProvider;
  
  switch (provider) {
    case "openai":
      return new OpenAiProvider(...);
    case "anthropic":
      return new AnthropicProvider(...);
    case "deepseek":
      return new DeepSeekProvider(...);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 6.2 统一响应解析

```typescript
// lib/ai/response-parser.ts
function parseProviderResponse(
  data: Record<string, unknown>,
  provider: AIProvider
): string {
  switch (provider) {
    case "openai":
    case "deepseek":
      return data.choices?.[0]?.message?.content ?? "";
    case "anthropic":
    case "longcat":
      return parseAnthropicContent(data.content);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

---

## 7. 测试用例

### 7.1 词义生成测试

```bash
curl -X POST https://teachplayer.tpgofighting.top/api/word-definitions \
  -H "Content-Type: application/json" \
  -d '{"lemmas":["hello","world"]}'
```

**期望**：返回包含2个定义的 JSON。

### 7.2 Moments 测试

```bash
curl -X POST https://teachplayer.tpgofighting.top/api/generate-moments \
  -H "Content-Type: application/json" \
  -d '{"videoId":"2zdL__16MY4","segments":[{"start":0,"duration":1,"text":"test"}]}'
```

**期望**：返回包含关键时刻的 JSON（教育视频）或空数组（非教育视频）。
