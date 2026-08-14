# app/api/chat/route.ts

**文件路径**：`app/api/chat/route.ts`

**功能摘要**：基于视频转录文本的对话式问答 API，用户可针对特定视频提问，AI 根据字幕内容回答。

## 关键实现细节

- **HTTP 方法**：POST
- **安全配置**：限流 20 次/分钟，body 上限 32KB，scope 为 `chat`

### 请求参数（Zod Schema）
- `videoId`：视频 ID
- `question`：用户问题，3-800 字符

### 处理流程
1. 获取用户 ID
2. 校验请求参数
3. 从缓存获取转录文本，若无则实时拉取并缓存
4. 调用 `aiProvider.answerQuestion({ question, transcript })` 生成回答
5. 返回回答结果

### 返回值
AI 生成的回答对象（由 `getAiProvider` 返回）

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/ai/provider` | AI 问答服务 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/cache` | 转录缓存 |
| `@/lib/youtube/metadata` | YouTube 元数据（缓存未命中时） |
| `@/lib/youtube/transcript-provider` | YouTube 转录（缓存未命中时） |

## 关联功能模块

- 视频工作区中的"对话问答"标签页
- 视频分析主接口 `/api/video-analysis`
