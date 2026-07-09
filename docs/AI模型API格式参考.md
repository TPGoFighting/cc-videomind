# AI 模型 API 格式参考

> 本文档汇总主流 AI 模型的 API 请求/响应格式，供 cc-videomind 项目适配参考。

---

## 1. OpenAI (GPT-4o / GPT-4)

### 端点

```
POST https://api.openai.com/v1/chat/completions
```

### 认证

```
Authorization: Bearer <api_key>
```

### 请求格式

```json
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "max_tokens": 1024,
  "temperature": 1.0,
  "response_format": {"type": "json_object"}
}
```

### 响应格式

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677858242,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 13,
    "completion_tokens": 7,
    "total_tokens": 20
  }
}
```

### 关键特征

| 特征 | 说明 |
|------|------|
| **内容结构** | `message.content` 是**扁平字符串** |
| **System Prompt** | 作为 `role: "system"` 消息传入 |
| **Thinking/CoT** | 推理模型 (o1/o3) 的推理 token 对用户**不可见**，仅返回最终答案 |
| **JSON 模式** | 通过 `response_format: {"type": "json_object"}` 强制返回 JSON |
| **Tool Calls** | `message.tool_calls` 数组 |

---

## 2. Anthropic (Claude)

### 端点

```
POST https://api.anthropic.com/v1/messages
```

### 认证

```
x-api-key: <api_key>
anthropic-version: 2023-06-01
```

### 请求格式

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "system": "You are a helpful assistant.",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "thinking": {
    "type": "enabled",
    "budget_tokens": 10000
  }
}
```

### 响应格式

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-20250514",
  "content": [
    {"type": "thinking", "thinking": "Let me consider..."},
    {"type": "text", "text": "Hello! How can I help?"}
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 12,
    "output_tokens": 6,
    "output_tokens_details": {"thinking_tokens": 150}
  }
}
```

### 关键特征

| 特征 | 说明 |
|------|------|
| **内容结构** | `content` 是**类型化块数组** `[{type, ...}]` |
| **System Prompt** | 顶层 `system` 参数（不是消息） |
| **Thinking/CoT** | 原生支持，`type: "thinking"` 块在 `content[]` 中 |
| **Tool Calls** | `type: "tool_use"` 块在 `content[]` 中 |
| **停止信号** | `stop_reason: "end_turn"` (不是 `finish_reason`) |
| **Token 计数** | `input_tokens` / `output_tokens` (不是 `prompt_tokens`) |

### Thinking 块详解

当启用 extended thinking 时，`content` 数组可能包含：

```json
{
  "content": [
    {"type": "thinking", "thinking": "推理过程..."},
    {"type": "text", "text": "最终答案"}
  ]
}
```

**重要**：thinking 块可能出现在 text 块之前，解析时需要处理这种顺序。

---

## 3. DeepSeek

### 端点

```
POST https://api.deepseek.com/chat/completions
```

### 认证

```
Authorization: Bearer <api_key>
```

### 请求格式

```json
{
  "model": "deepseek-chat",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "thinking": {"type": "enabled"}
}
```

### 响应格式

```json
{
  "id": "chatcmpl-abc",
  "object": "chat.completion",
  "created": 1683130927,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "reasoning_content": "Let me think step by step...",
        "content": "The final answer is 42."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 100,
    "total_tokens": 110
  }
}
```

### 关键特征

| 特征 | 说明 |
|------|------|
| **格式兼容** | OpenAI 兼容格式 |
| **内容结构** | `message.content` 是扁平字符串 |
| **Thinking/CoT** | `message.reasoning_content` 字段（与 `content` 同级） |
| **System Prompt** | `role: "system"` 消息 |

### Thinking 字段详解

DeepSeek 将推理过程放在 `reasoning_content` 字段：

```json
{
  "message": {
    "role": "assistant",
    "reasoning_content": "让我一步步思考...",
    "content": "最终答案是 42。"
  }
}
```

---

## 4. LongCat (长亭科技)

### 双端点架构

LongCat 是一个**代理网关**，同时提供 OpenAI 和 Anthropic 兼容的 API。

| 端点 | 格式 |
|------|------|
| `POST https://api.longcat.chat/openai/v1/chat/completions` | OpenAI 格式 |
| `POST https://api.longcat.chat/anthropic/v1/messages` | Anthropic 格式 |

### 认证

```
Authorization: Bearer <api_key>
```

### 响应格式 (Anthropic 端点)

```json
{
  "id": "msg_abc123",
  "type": "message",
  "role": "assistant",
  "model": "LongCat-2.0",
  "content": [
    {"type": "thinking", "thinking": "推理过程..."},
    {"type": "text", "text": "最终答案"}
  ],
  "stop_reason": "end_turn",
  "usage": {"input_tokens": 12, "output_tokens": 8}
}
```

### ⚠️ LongCat 特殊行为

**问题**：LongCat 的 Anthropic 端点在某些情况下**只返回 thinking 块，不返回 text 块**。

```json
{
  "content": [
    {"type": "thinking", "thinking": "让我分析这个请求..."}
    // 注意：没有 type: "text" 块！
  ]
}
```

**解决方案**：当没有 `text` 块时，从 `thinking` 块中提取内容。

---

## 格式对比总表

| 特征 | OpenAI | Anthropic | DeepSeek | LongCat |
|------|--------|-----------|----------|---------|
| **格式风格** | 自有标准 | 自有标准 | OpenAI 兼容 | 双格式代理 |
| **响应包装** | `choices[]` 数组 | 顶层 `message` 对象 | `choices[]` 数组 | 取决于端点 |
| **内容结构** | 扁平 `string` | `content[]` 类型化块数组 | 扁平 `string` | 取决于端点 |
| **System Prompt** | `role: "system"` 消息 | 顶层 `system` 参数 | `role: "system"` 消息 | 取决于端点 |
| **Thinking/CoT** | 隐藏 (推理 token) | `thinking` 块 | `reasoning_content` 字段 | `thinking` 块 |
| **Tool Calls** | `message.tool_calls` | `tool_use` 块 | `message.tool_calls` | 取决于端点 |
| **停止信号** | `finish_reason: "stop"` | `stop_reason: "end_turn"` | `finish_reason: "stop"` | 取决于端点 |
| **Token 计数** | `prompt_tokens` | `input_tokens` | `prompt_tokens` | 取决于端点 |

---

## 5. 适配建议

### cc-videomind 项目当前使用

- **Provider**: `anthropic` (通过 LongCat 代理)
- **端点**: `https://api.longcat.chat/anthropic/v1/messages`
- **问题**: LongCat 返回 thinking-only 响应

### 推荐适配策略

1. **统一解析层**：创建 `parseAIResponse()` 函数，自动检测格式
2. **Thinking 块处理**：当没有 `text` 块时，从 `thinking` 块提取内容
3. **JSON 提取增强**：从 thinking 文本中智能提取 JSON
4. **多 Provider 支持**：支持 OpenAI / Anthropic / DeepSeek 格式切换

### 代码参考

```typescript
// lib/ai/provider.ts 中的解析逻辑
function parseAIResponse(data: Record<string, unknown>): string {
  const content = data.content;
  
  // 1. 尝试找 text 块 (标准 Anthropic 格式)
  if (Array.isArray(content)) {
    const textBlock = content.find(b => b.type === "text");
    if (textBlock?.text) return textBlock.text;
    
    // 2. 回退：从 thinking 块提取 (LongCat 特殊行为)
    const thinkingBlocks = content.filter(b => b.type === "thinking");
    if (thinkingBlocks.length > 0) {
      return thinkingBlocks.map(b => b.thinking).join("\n");
    }
  }
  
  throw new Error("无法解析 AI 响应");
}
```
