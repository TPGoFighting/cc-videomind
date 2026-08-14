# app/api/checkin/route.ts

**文件路径**：`app/api/checkin/route.ts`

**功能摘要**：打卡签到 API，查询和更新用户每日学习打卡状态，计算连续天数。

## 关键实现细节

### GET — 查询打卡状态
- 查询近 30 天打卡数据
- 计算连续天数（每天需 ≥10 词才算完成）
- 今天未完成不打断连续

### POST — 打卡
- **安全配置**：限流 60 次/分钟，scope 为 `checkin`
- **参数**：`wordCount`（默认 1）
- **流程**：
  1. 查询今日是否已有记录
  2. 有 → 累加 `word_count`
  3. 无 → 新增记录
  4. 重新查询并返回最新状态

### 返回值（CheckinStatus）
```json
{
  "streak": 5,           // 连续天数
  "todayCompleted": true, // 今日是否完成（≥10 词）
  "todayCount": 15,      // 今日学习词数
  "calendar": [          // 近 30 天日历
    { "date": "2025-01-15", "count": 12 }
  ]
}
```

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/lib/security/middleware` | 安全中间件 |
| `@/lib/supabase/quota` | 用户认证 |
| `@/lib/supabase/server` | Supabase Service Client |
| `@/lib/types` | CheckinStatus 类型 |

## 关联功能模块

- 每日复习页面 `/review`（复习后自动打卡）
- 复习 API `/api/review`（提交复习时自动累加）
- 连续打卡日历组件 `StreakCalendar`
