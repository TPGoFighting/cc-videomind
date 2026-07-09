# app/api/word-definitions/route.ts

**文件路径**：`app/api/word-definitions/route.ts`

**功能摘要**：批量获取单词释义，优先从缓存读取，缺失的单词通过 AI 批量生成并缓存。

## 关键实现细节

- **HTTP 方法**：POST
- **安全配置**：限流 10 次/分钟，body 上限 256KB，scope 为 `word-definitions`

### 请求参数（WordDefinitionsRequestSchema）
- `lemmas`：单词原形数组

### 处理流程
1. 查询已缓存的释义 `getCachedWordDefinitions(lemmas)`
2. 计算缺失的单词
3. 调用 `aiProvider.defineWords({ lemmas: missing })` 批量生成
4. 写入缓存（非致命）
5. 合并返回所有释义

### 返回值
```json
{
  "definitions": [{
    "lemma": "string",
    "phonetic": "string",
    "partOfSpeech": "string",
    "definitionZh": "string",
    "definitionEn": "string",
    "exampleEn": "string",
    "exampleZh": "string"
  }]
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/ai/provider` | AI 词义生成 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/cache-learn` | 词义缓存读写 |
| `@/lib/types` | Schema 定义 |

## 关联功能模块

- 单词本页面 `/vocabulary`
- 视频转录文本中高亮单词
- 每日复习 `/review`
