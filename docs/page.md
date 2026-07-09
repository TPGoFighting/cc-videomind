# app/page.tsx

**文件路径**：`app/page.tsx`

**功能摘要**：首页（Landing Page），展示产品介绍、核心功能、定价方案、路线图，桌面端和移动端分别渲染不同布局。

## 关键实现细节

### 桌面端布局（md 以上）
1. **Hero 区域** — SplitText 逐字揭示 + 鼠标视差 + 3D 装饰
2. **跑马灯** — 功能关键词无限滚动
3. **为什么做这个** — 项目起源故事 + 3D Stork
4. **核心功能** — Bento 不规则网格 + Box 3D 装饰
5. **数据说话** — 大数字渐变 + 3D Flamingo/Target
6. **订阅方案** — 3D 倾斜定价卡 + Coin 3D 装饰
7. **路线图** — 贝塞尔曲线时间线 + 3D Door/SittingBox
8. **示例视频推荐**
9. **底部 CTA** — 视频 URL 输入 + 3D Horse
10. **滚动导航点**

### 移动端布局（md 以下）
- 使用 `MobileHome` 组件精简布局

### 组件结构
- `Navbar` — 导航栏
- `AnimatedBackground` — 动画背景
- `GlbDecoration` — 3D GLB 模型装饰
- `HeroSection` / `WhySection` / `BentoFeatures` / `MarqueeStrip` / `PricingSection` / `RoadmapSection` / `ScrollNav` / `StatsSection` / `ExampleVideos` / `VideoUrlInput`

### 内部组件
- `StatsSectionWithFlamingo` — 统计区域 + 3D 装饰
- `RoadmapSectionWithSittingBox` — 路线图 + 3D 装饰
- `BottomCta` — 底部行动号召

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/components/navbar` | 导航栏 |
| `@/components/animated-background` | 动画背景 |
| `@/components/glb-decoration` | 3D 模型装饰 |
| `@/lib/glb-models` | 3D 模型路径配置 |
| `@/components/home/*` | 首页各区域组件 |
| `@/components/stats-section` | 统计数据展示 |
| `@/components/example-videos` | 示例视频 |
| `@/components/video-url-input` | URL 输入框 |
| `@/components/mobile-home` | 移动端首页 |
| `@/components/youtube-status-alert` | YouTube 连通性告警 |

## 关联功能模块

- 视频解析入口
- 订阅页面
- 探索页面
