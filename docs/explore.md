# app/explore/page.tsx

**文件路径**：`app/explore/page.tsx`

**功能摘要**：探索页面，展示精选 YouTube 视频列表，点击可直接进入 AI 分析。

## 关键实现细节

- **组件类型**：客户端组件（`"use client"`）
- **数据源**：硬编码的 12 个 YouTube 视频 ID（`CURATED_IDS`）
- **元数据获取**：通过 YouTube oEmbed API 获取标题、缩略图、频道名

### UI 结构
1. 导航栏 + 动画背景
2. 返回首页链接
3. 标题区域（"探索更多 学习视频"）
4. 视频网格（2/3/4 列响应式）
5. 底部 CTA（"有自己的视频想分析？"）

### 动画
- GSAP ScrollTrigger 交错入场动画（每张卡片延迟 0.06s）
- 卡片悬停效果（缩放、边框发光、播放按钮显示）

### 骨架屏
- 加载时显示 12 个骨架卡片（`animate-breathe`）

## 依赖关系

| 模块 | 用途 |
|------|------|
| `next/image` | 图片优化 |
| `next/link` | 路由链接 |
| `gsap` / `@gsap/react` | 动画 |
| `lucide-react` | 图标 |
| `@/components/navbar` | 导航栏 |
| `@/components/animated-background` | 动画背景 |

## 关联功能模块

- 首页示例视频
- 视频工作区
