# home/hero-section.tsx

**文件路径**：`components/home/hero-section.tsx`

## 功能摘要

首页 Hero 区域，包含品牌标语逐字入场动画、视频链接输入框、订阅 CTA、3D 预览卡片和 3D 模型装饰。

## 关键实现细节

- **入场 Timeline**：badge → 逐字标题（back.out 弹性）→ 副标题 → 输入框 → CTA → 滚动提示
- **splitText**：将标题拆分为独立字符 span，实现逐字动画
- **鼠标跟随聚光灯**：600px 蓝色模糊圆跟随鼠标移动
- **3D 预览卡片**：`PreviewCard` 子组件，鼠标移动时 rotateX/Y 倾斜，离开时弹性回正
- **3D 模型**：右侧 parrot 模型（GlbDecoration），SVG 线框环面装饰
- **滚动提示**：底部 chevron 弹跳动画

## 依赖关系

- `gsap`、`@gsap/react`
- `lucide-react`（Crown、ChevronDown）
- `next/link`
- `@/components/video-url-input`、`@/components/glb-decoration`
- `@/lib/glb-models`（GLB_MODELS.parrot）
- `@/lib/gsap/constants`（EASE）

## 关联模块

- 首页顶部核心展示区
