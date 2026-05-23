# VideoMind 订阅功能 & 单词查询功能 技术报告

> 供 APP 端开发同步使用 | 更新于 2026-05-22

---

## 一、订阅功能

### 1.1 方案结构

三档订阅制，定义在 `lib/plans.ts`：

| 字段 | 免费版 (free) | 专业版 (pro) | 旗舰版 (max) |
|------|:----------:|:----------:|:----------:|
| 月费 | ¥0 | ¥15 | ¥50 |
| 每日限额 | — | 10次 | 30次 |
| 每周限额 | — | 30次 | 100次 |
| 总计限额 | 3次（不重置） | — | — |

**TypeScript 类型：**

```typescript
type SubscriptionTier = "free" | "pro" | "max";

interface PlanConfig {
  tier: SubscriptionTier;
  name: string;           // "Free" | "Pro" | "Max"
  nameZh: string;         // "免费版" | "专业版" | "旗舰版"
  price: number;          // 月费（人民币）
  dailyLimit: number;
  weeklyLimit: number;
  features: string[];
  highlighted: boolean;   // 推荐方案标记
}
```

### 1.2 数据库表

#### `profiles` 表（关键字段）

| 列名 | 类型 | 约束 |
|------|------|------|
| `id` | uuid | PK, FK→auth.users |
| `subscription_tier` | text | NOT NULL, DEFAULT 'free', CHECK('free','pro','max') |
| `role` | text | NOT NULL, DEFAULT 'user', CHECK('user','admin') |

#### `payment_submissions` 表

| 列名 | 类型 | 约束 |
|------|------|------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() |
| `user_id` | uuid | NOT NULL, FK→auth.users, ON DELETE CASCADE |
| `tier` | text | NOT NULL, CHECK('pro','max') |
| `transaction_id` | text | NOT NULL |
| `status` | text | NOT NULL, DEFAULT 'pending', CHECK('pending','approved','rejected') |
| `reviewed_by` | uuid | FK→auth.users, nullable |
| `admin_notes` | text | nullable |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `reviewed_at` | timestamptz | nullable |

#### `usage_events` 表（配额统计）

| 列名 | 类型 | 约束 |
|------|------|------|
| `id` | uuid | PK |
| `user_id` | uuid | FK→auth.users, nullable（匿名用户为 null） |
| `video_id` | text | nullable |
| `event_type` | text | NOT NULL（如 'video_analysis'） |
| `ip_address` | text | nullable（匿名用户追踪用） |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

### 1.3 API 端点

#### `GET /api/me` — 用户信息（含 tier）

无需请求体。返回当前用户的 `subscription_tier` 和 `role`。

**响应（200）：**
```json
{
  "role": "admin",
  "email": "user@example.com",
  "subscription_tier": "pro",
  "authenticated": true
}
```

**未登录（200）：**
```json
{
  "role": null,
  "email": null,
  "subscription_tier": null,
  "authenticated": false
}
```

---

#### `POST /api/video-analysis` — 配额检查（入口）

在解析视频前调用。超过配额返回 HTTP 402。

**请求体：**
```json
{
  "url": "https://youtube.com/watch?v=xxx",
  "videoId": "xxx"
}
```

**配额超限响应（402）：**
```json
{
  "ok": false,
  "error": {
    "code": "quota_exceeded",
    "message": "总计解析次数已达上限（3次），请升级至 Pro 或 Max 解锁更多配额。"
  }
}
```

**配额逻辑（`checkAnalysisQuota`）：**

| 用户类型 | 计数方式 | 重置规则 |
|----------|---------|---------|
| 匿名 | 按 IP 统计总数 | 不重置，终身 1 次 |
| 管理员 | 不限制 | — |
| 免费 | 按 user_id 统计总数 | 不重置，终身 3 次 |
| Pro | 按 user_id 统计当日+当周（UTC+8） | 每日 0:00 / 每周一 0:00 |
| Max | 同 Pro | 同 Pro |

**周起始计算（UTC+8 周一 00:00）：**
```
当前时间 → 转 UTC+8 → 计算周一偏移 → 设置 00:00:00 → 转回 UTC
```

---

#### `GET /api/payment/submit` — 查询待审核提交

**响应（200）：**
```json
{
  "pending": {
    "tier": "pro",
    "status": "pending",
    "createdAt": "2026-05-22T10:00:00Z"
  }
}
```

无待审核提交时返回 `{ "pending": null }`。

---

#### `POST /api/payment/submit` — 提交付款凭证

**请求体：**
```json
{
  "tier": "pro",
  "transactionId": "20260522200040011100660012345678"
}
```

**校验规则：**
- `tier`: 仅允许 `"pro"` 或 `"max"`
- `transactionId`: 1-100 字符
- 同一用户+同一方案已有 pending 提交时返回 409

**成功响应（200）：**
```json
{
  "ok": true,
  "data": { "ok": true }
}
```

---

#### `GET /api/admin/payments?status=pending` — 管理员查看提交

**Query 参数：** `status` = `pending` | `approved` | `rejected` | `all`

**鉴权：** 需要登录 + `profiles.role = 'admin'`

**响应（200）：**
```json
{
  "submissions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "userEmail": "user@example.com",
      "tier": "pro",
      "transaction_id": "20260522...",
      "status": "pending",
      "created_at": "2026-05-22T10:00:00Z",
      "reviewed_by": null,
      "admin_notes": null,
      "reviewed_at": null
    }
  ]
}
```

---

#### `PUT /api/admin/payments` — 审批/拒绝

**请求体：**
```json
{
  "submissionId": "uuid",
  "action": "approve",
  "notes": "已确认收款"
}
```

**action：** `"approve"` | `"reject"`
**notes：** 可选，最大 500 字符

**审批通过时的操作：**
1. 更新 `payment_submissions.status = 'approved'`，记录审批人和时间
2. 更新 `profiles.subscription_tier = submission.tier`
3. 清除 AI provider 缓存

**响应（200）：**
```json
{
  "ok": true,
  "status": "approved"
}
```

### 1.4 付款流程（端到端）

```
用户访问 /subscribe
  → 选择方案（Pro/Max）
  → 扫描微信/支付宝收款码（/public/wechat-pay.jpg, /public/alipay.jpg）
  → 完成支付，复制交易单号
  → POST /api/payment/submit 提交单号
  → 显示"审核中"状态

管理员访问 /settings（设置页 → 付款审核面板）
  → 查看待审核列表（GET /api/admin/payments?status=pending）
  → 核对收款后点击"通过"
  → PUT /api/admin/payments { action: "approve" }
  → 用户 tier 自动升级，配额即时生效
```

### 1.5 客户端状态管理

`AuthContext` 通过 `useAuth()` 暴露：

```typescript
{
  user: User | null;
  isAdmin: boolean;
  subscriptionTier: SubscriptionTier;  // "free" | "pro" | "max"
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}
```

- 登录时调用 `GET /api/me` 获取 tier
- 登出时重置为 `"free"`
- 每次 `checkAnalysisQuota()` 实时读库，无需 re-login

---

## 二、单词查询功能

### 2.1 数据库表

#### `word_definitions`（全局 AI 缓存）

| 列名 | 类型 | 约束 |
|------|------|------|
| `id` | uuid | PK |
| `lemma` | text | NOT NULL, UNIQUE（词元/原形） |
| `language` | text | NOT NULL, DEFAULT 'en' |
| `phonetic` | text | IPA 音标，nullable |
| `part_of_speech` | text | 词性（n./v./adj.等），nullable |
| `definition_zh` | text | NOT NULL（中文释义） |
| `definition_en` | text | 英文释义，nullable |
| `example_en` | text | 英文例句，nullable |
| `example_zh` | text | 中文例句翻译，nullable |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |

#### `user_vocabulary`（用户生词本）

| 列名 | 类型 | 约束 |
|------|------|------|
| `id` | uuid | PK |
| `user_id` | uuid | FK→auth.users, ON DELETE CASCADE |
| `word_id` | uuid | FK→word_definitions, ON DELETE CASCADE |
| `video_id` | text | NOT NULL（来源视频） |
| `created_at` | timestamptz | NOT NULL |
| 联合唯一约束 | | `(user_id, word_id)` |

#### `user_word_reviews`（SM-2 间隔重复）

| 列名 | 类型 | 约束 |
|------|------|------|
| `id` | uuid | PK |
| `user_id` | uuid | FK→auth.users, ON DELETE CASCADE |
| `lemma` | text | NOT NULL |
| `repetitions` | int | DEFAULT 0（连续正确次数） |
| `ease_factor` | numeric | DEFAULT 2.5（难度系数） |
| `interval_days` | int | DEFAULT 0（当前间隔天数） |
| `next_review_at` | timestamptz | 下次复习时间 |
| `last_reviewed_at` | timestamptz | 上次复习时间 |
| `status` | text | CHECK('learning','reviewing','mastered') |
| 联合唯一约束 | | `(user_id, lemma)` |

#### `user_checkins`（每日打卡）

| 列名 | 类型 | 约束 |
|------|------|------|
| `id` | uuid | PK |
| `user_id` | uuid | FK→auth.users |
| `checkin_date` | date | NOT NULL |
| `word_count` | int | DEFAULT 0 |
| 联合唯一约束 | | `(user_id, checkin_date)` |

### 2.2 API 端点

#### `POST /api/word-definitions` — 批量查询词义

**请求体：**
```json
{
  "lemmas": ["ubiquitous", "serendipity", "ephemeral"]
}
```

**校验：** `lemmas` 为字符串数组，1-400 个，每项 1-50 字符

**响应（200）：**
```json
{
  "ok": true,
  "data": {
    "definitions": [
      {
        "lemma": "ubiquitous",
        "phonetic": "/juːˈbɪkwɪtəs/",
        "partOfSpeech": "adj.",
        "definitionZh": "无所不在的；普遍存在的",
        "definitionEn": "present, appearing, or found everywhere",
        "exampleEn": "Smartphones have become ubiquitous in modern life.",
        "exampleZh": "智能手机在现代生活中已无处不在。"
      }
    ]
  }
}
```

**逻辑：**
1. 先从 `word_definitions` 表查缓存
2. 未缓存的调用 AI 批量生成（每批 30 个词）
3. 生成结果异步回写缓存
4. 返回合并结果（缓存 + 新生成）

**限流：** 每 IP 10 次/60 秒

---

#### `GET /api/user-vocabulary` — 获取生词本

**Query 参数（可选）：** `?videoId=xxx` 筛选特定视频的生词

**响应（200）：**
```json
{
  "ok": true,
  "data": {
    "vocabulary": [
      {
        "id": "vocab-row-uuid",
        "wordId": "word-def-uuid",
        "lemma": "serendipity",
        "phonetic": "/ˌserənˈdɪpəti/",
        "partOfSpeech": "n.",
        "definitionZh": "意外发现珍奇事物的本领",
        "definitionEn": "the occurrence of events by chance in a happy way",
        "exampleEn": "Finding that book was pure serendipity.",
        "exampleZh": "找到那本书纯属机缘巧合。",
        "videoId": "dQw4w9WgXcQ",
        "createdAt": "2026-05-22T10:00:00Z"
      }
    ]
  }
}
```

---

#### `POST /api/user-vocabulary` — 收藏单词

**请求体：**
```json
{
  "lemma": "serendipity",
  "videoId": "dQw4w9WgXcQ"
}
```

**校验：** `lemma` 1-200 字符，`videoId` 1-20 字符

**逻辑：**
1. 查 `word_definitions`，不存在则创建占位行
2. Upsert 到 `user_vocabulary`（`user_id + word_id` 去重）

**响应（200）：**
```json
{
  "ok": true,
  "data": {
    "saved": true,
    "lemma": "serendipity",
    "wordId": "uuid"
  }
}
```

**限流：** 每 IP 30 次/60 秒

---

#### `DELETE /api/user-vocabulary?id=<vocabRowId>` — 删除生词

**响应（200）：**
```json
{
  "ok": true,
  "data": { "deleted": true }
}
```

---

#### `GET /api/review` — 获取待复习单词

返回 `next_review_at <= now()` 的单词（最多 20 个）。如果复习表为空但生词本有数据，自动将生词本所有词同步到复习表（初始状态）。

**响应（200）：**
```json
{
  "ok": true,
  "data": {
    "words": [
      {
        "lemma": "ubiquitous",
        "phonetic": "/juːˈbɪkwɪtəs/",
        "partOfSpeech": "adj.",
        "definitionZh": "无所不在的",
        "definitionEn": "present everywhere",
        "exampleEn": "...",
        "exampleZh": "...",
        "repetitions": 2,
        "easeFactor": 2.6,
        "intervalDays": 6,
        "status": "reviewing"
      }
    ]
  }
}
```

---

#### `POST /api/review` — 提交复习结果

**请求体：**
```json
{
  "reviews": [
    { "lemma": "ubiquitous", "quality": 4 },
    { "lemma": "ephemeral", "quality": 0 }
  ]
}
```

**quality 评分：** 0-5（测试中：正确=4，错误=0）
**限流：** 每 IP 30 次/60 秒

**响应（200）：**
```json
{
  "ok": true,
  "data": { "ok": true }
}
```

---

#### `GET /api/checkin` — 打卡状态

**响应（200）：**
```json
{
  "ok": true,
  "data": {
    "streak": 7,
    "todayCompleted": false,
    "todayCount": 5,
    "calendar": [
      { "date": "2026-05-22", "count": 15 },
      { "date": "2026-05-21", "count": 20 }
    ]
  }
}
```

**连续天数计算：** 从今天往回遍历，连续每天 >= 10 词才计数

### 2.3 SM-2 间隔重复算法

```typescript
function sm2(
  quality: number,      // 0-5 评分
  repetitions: number,  // 当前连续正确次数
  easeFactor: number,   // 当前难度系数
  intervalDays: number  // 当前间隔天数
): {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: Date;
  status: "learning" | "reviewing" | "mastered";
}
```

**规则：**

| 条件 | 逻辑 |
|------|------|
| quality < 3（失败） | repetitions=0, easeFactor-=0.2（min 1.3）, 10分钟后复习 |
| quality >= 3（通过） | |
| -- 首次通过 | interval = 1天 |
| -- 第二次通过 | interval = 3天 |
| -- 后续通过 | interval = round(intervalDays × easeFactor) |
| -- quality >= 4（优秀） | interval ×= 1.2 加成 |
| easeFactor 更新 | EF += 0.1 - (5-q)×0.08 + (5-q)×0.02, min 1.3 |
| status 判定 | learning（repetitions≤0）→ reviewing（repetitions>0）→ mastered（interval≥30） |

**初始值：** `repetitions=0, easeFactor=2.5, intervalDays=0`

### 2.4 词元提取（Lemmatization）

客户端侧 `extractLemmas()` 函数（`lib/utils/tokenize.ts`）：

1. 将字幕文本按词边界分割
2. 过滤停用词（a, the, is, of, to, in, that, for, it, on, be, we, I, you, he, she 等）
3. 仅保留纯英文词（`/^[a-zA-Z]+$/`）
4. 词形还原：
   - 硬编码 ~100 个不规则变形（men→man, went→go, better→good, running→run 等）
   - 规则后缀剥离：-ing, -ed, -s, -es, -ly, -er, -est, -'s
5. 去重，返回唯一词元列表

### 2.5 AI 词义生成

**Prompt 策略（`lib/ai/prompts-learn.ts`）：**

每批 30 个词，AI 被指示为"专业英语词典编纂者"，输出 JSON 数组：

```json
[
  {
    "lemma": "ubiquitous",
    "phonetic": "/juːˈbɪkwɪtəs/",
    "partOfSpeech": "adj.",
    "definitionZh": "无所不在的",
    "definitionEn": "present everywhere",
    "exampleEn": "Smartphones have become ubiquitous.",
    "exampleZh": "智能手机已无处不在。"
  }
]
```

输出经 `WordDefinitionSchema`（Zod）校验。

### 2.6 客户端组件交互

```
字幕文本
  → extractLemmas() 词元提取
  → useWordDefinitions() [SWR] → POST /api/word-definitions
  → Map<string, WordDefinition>
  → TranscriptViewer 渲染
      → 已知词高亮蓝色 (#0099ff)
      → 桌面端：hover 500ms → 弹出 WordCard
      → 移动端：点击 → 弹出 WordCard（带遮罩）
      → WordCard：音标 + 中英释义 + 例句 + 收藏按钮
          → 点击收藏 → POST /api/user-vocabulary

复习页面 (/review)
  → GET /api/review（获取待复习词）
  → 生成 4 选 1 选择题（随机中→英 或 英→中）
  → 每题即时提交 → POST /api/review（SM-2 评分）
  → 完成后展示：正确率 + 连续天数 + 30日打卡日历

生词本 (/vocabulary)
  → GET /api/user-vocabulary
  → 列表展示所有收藏词
  → 支持删除 + 跳转来源视频
```

---

## 三、APP 端开发要点

### 订阅模块

1. **认证**：使用 Supabase Auth（邮箱/密码），JWT 通过 `Authorization: Bearer <token>` 传递
2. **tier 获取**：调 `GET /api/me` 从 `subscription_tier` 字段读取
3. **配额判断**：每次解析前调 `POST /api/video-analysis`，402 响应表示超限，展示 `error.message`
4. **付费流程**：展示 QR 码 → 用户支付 → 提交交易单号 → 等待管理员审核
5. **tier 变更**：管理员审批通过后，下次 `GET /api/me` 自动获取新 tier，无需重新登录

### 单词模块

1. **词义获取**：`POST /api/word-definitions` 批量查询，利用全局缓存减少 AI 调用
2. **词元提取**：需在 APP 端实现相同的 lemmatization 逻辑（不规则词表 + 后缀规则）
3. **生词本**：`GET/POST/DELETE /api/user-vocabulary`
4. **复习系统**：`GET /api/review` 获取 → 答题 → `POST /api/review` 提交 SM-2 评分
5. **SM-2 算法**：按上面规则实现，注意边界条件（min easeFactor=1.3, max interval 不限）
6. **打卡**：`GET /api/checkin` 获取连续天数和日历数据
