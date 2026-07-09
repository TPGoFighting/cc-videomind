# mobile-home.tsx

**文件路径**：`components/mobile-home.tsx`

## 功能摘要

移动端首页，包含 YouTube 链接输入框、建议标签、随机推荐视频卡片，以及 GSAP 驱动的入场和交互动画。

## 关键实现细节

- **输入提交**：POST `/api/video-info` 获取视频元数据，成功后跳转 `/video/${videoId}`
- **建议标签**：4 个预设分类（访谈/科技/数学/脱口秀），点击填充对应 URL
- **推荐视频**：从 10 个 ID 中随机取 2 个，通过 oEmbed 获取元数据
- **动画系统**：页面入场 0.4s 渐显、Logo 浮动、按钮按压弹性回弹、骨架屏脉冲
- **背景**：`AnimatedBackground variant="mobile"`
- **响应式**：专为移动端设计，纵向布局

## 依赖关系

- `gsap`、`@gsap/react`
- `next/image`、`next/link`、`next/navigation`（useRouter）
- `lucide-react`（ArrowRight、Loader2、Play）
- `@/lib/types`（JsonResponse、VideoMetadata）
- `./animated-background`

## 关联模块

- 移动端入口页面，与 `hero-section.tsx`（桌面端）功能对应
