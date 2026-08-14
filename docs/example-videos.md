# example-videos.tsx

**文件路径**：`components/example-videos.tsx`

## 功能摘要

示例视频展示区，从预定义的 YouTube 视频 ID 池中随机选取 6 个，通过 oEmbed API 获取元数据后渲染为可点击的视频卡片网格。

## 关键实现细节

- **视频池**：10 个硬编码 YouTube videoId，每次随机取 6 个
- **数据获取**：`fetchVideoMeta` 调用 YouTube oEmbed API 获取 title、thumbnailUrl、author_name，失败时返回兜底数据
- **VideoCard 子组件**：带 GSAP ScrollTrigger 滚动入场动画（0.5s 渐显 + 上移），hover 时缩略图放大 + 播放按钮显现
- **骨架屏**：加载中显示 6 个 `animate-breathe` 脉冲占位卡片
- **响应式网格**：2 列（手机）→ 3 列（平板/桌面）
- **底部链接**：`/explore` 浏览更多

## 依赖关系

- `next/image`、`next/link`
- `gsap`、`@gsap/react`（useGSAP + ScrollTrigger）
- `lucide-react`（Play、ArrowRight）

## 关联模块

- 首页底部展示区
