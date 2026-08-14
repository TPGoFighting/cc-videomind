# app/api/review/route.ts

**文件路径**：`app/api/review/route.ts`

**功能摘要**：单词复习 API，基于 SM-2 间隔重复算法管理复习进度，支持获取待复习单词和提交复习结果。

## 关键实现细节

### SM-2 算法
- **quality < 3**（答错）：重置 `repetitions = 0`，10 分钟后重试
- **quality ≥ 3**（答对）：
  - 第 1 次：间隔 1 天
  - 第 2 次：间隔 3 天
  - 之后：`intervalDays × easeFactor`
  - quality ≥ 4：额外 ×1.2 加成

### GET — 获取待复习单词
- 查询 `user_word_reviews` 中 `next_review_at ≤ now` 的记录，最多 20 条
- 若无待复习记录，自动从 `user_vocabulary` 同步初始化
- 关联 `word_definitions` 表获取释义

### POST — 提交复习结果
- **安全配置**：限流 30 次/分钟，scope 为 `review`
- **参数**：`reviews` 数组，每项包含 `lemma` 和 `quality`（0-5）
- **流程**：
  1. 读取现有复习状态
  2. 计算 SM-2 下次复习时间和间隔
  3. 更新/插入 `user_word_reviews`
  4. 自动更新当日打卡记录

### 返回值
```json
// GET
{ "words": [{ "lemma", "phonetic", "partOfSpeech", "definitionZh", "definitionEn", "exampleEn", "exampleZh", "repetitions", "easeFactor", "intervalDays", "status" }] }

// POST
{ "ok": true }
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `zod` | 参数校验 |
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/server` | Supabase Service Client |

## 关联功能模块

- 每日复习页面 `/review`
- 打卡系统 `/api/checkin`
- 单词本 `/vocabulary`
