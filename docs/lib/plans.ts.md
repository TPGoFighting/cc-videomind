# lib/plans.ts

## 文件路径
`lib/plans.ts`

## 功能摘要
订阅计划配置定义。

## 关键实现细节
1. `SubscriptionTier` - 订阅类型
   - free: 免费版
   - pro: 专业版
   - max: 旗舰版

2. `PlanConfig` - 计划配置接口
   - tier: 订阅类型
   - name/nameZh: 计划名称
   - price: 月费（人民币）
   - dailyLimit/weeklyLimit: 使用限制
   - features: 功能列表
   - highlighted: 是否高亮显示

3. `PLAN_CONFIGS` - 计划配置数组
   - free: 总计 3 次视频分析
   - pro: 每日 10 次，每周 30 次
   - max: 每日 30 次，每周 100 次

4. `getPlanConfig()` - 根据 tier 查找计划配置

## 依赖关系
- 无外部依赖

## 关联的功能模块
- 订阅和支付系统
- 用户限额管理