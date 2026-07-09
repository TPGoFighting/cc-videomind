# home/pricing-section.tsx

**文件路径**：`components/home/pricing-section.tsx`

## 功能摘要

首页订阅定价区，展示 Free/Pro/Max 三栏定价卡片，带 3D 倾斜效果和 Pro 卡光晕脉冲。

## 关键实现细节

- **三栏定价**：Free（免费，5 次/月）、Pro（推荐，100 次/月）、Max（无限）
- **Pro 高亮**：渐变推荐标签、蓝色边框、光晕脉冲动画（2.5s 周期）
- **3D 倾斜**：每张卡片鼠标跟随 rotateX/Y，离开时弹性回正
- **入场动画**：ScrollTrigger 触发，stagger 交错弹入
- **当前方案判断**：已登录用户如果在 free 层，显示"当前方案"禁用状态
- **CTA**：free → /register，pro/max → /subscribe

## 依赖关系

- `gsap`、`@gsap/react`
- `lucide-react`（Crown、Check、Zap）
- `next/link`
- `@/components/auth-context`（useAuth）
- `@/lib/plans`（getPlanConfig、SubscriptionTier）
- `@/lib/gsap/constants`（STAGGER）

## 关联模块

- 首页定价区
