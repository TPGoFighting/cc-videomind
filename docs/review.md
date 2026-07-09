# app/review/page.tsx

**文件路径**：`app/review/page.tsx`

**功能摘要**：每日复习页面，基于 SM-2 间隔重复算法的单词测验界面，支持打卡日历。

## 关键实现细节

- **组件类型**：客户端组件
- **数据获取**：并行调用 `/api/review` 和 `/api/checkin`

### 测验系统
- **题目生成**：`buildQuestions` 函数从待复习单词中随机生成四选一选择题
- **两种模式**：
  - `word-to-zh`：显示英文单词，选择中文释义
  - `zh-to-word`：显示中文释义，选择英文单词
- **干扰项**：从其他单词中随机选取 3 个

### 交互流程
1. 加载待复习单词和打卡状态
2. 逐题展示，用户选择答案
3. 正确 → quality=4，错误 → quality=0
4. 提交到 `/api/review` 更新 SM-2 参数
5. 正确延迟 800ms，错误延迟 1200ms 后下一题
6. 全部完成 → 显示成绩总结

### 成绩总结
- 正确数 / 总数
- 最高连击
- 今日总量
- 连续天数日历（`StreakCalendar`）

### 依赖关系

| 模块 | 用途 |
|------|------|
| `next/link` | 路由链接 |
| `lucide-react` | 图标 |
| `@/components/navbar` | 导航栏 |
| `@/components/streak-calendar` | 连续打卡日历 |
| `@/components/auth-context` | 认证上下文 |
| `@/lib/utils/cn` | className 合并 |
| `@/lib/types` | CheckinStatus, ReviewWord, JsonResponse |

## 关联功能模块

- API `/api/review`、`/api/checkin`
- 单词本 `/vocabulary`
- SM-2 算法实现在 `/api/review`
