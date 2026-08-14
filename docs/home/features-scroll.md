# home/features-scroll.tsx

**文件路径**：`components/home/features-scroll.tsx`

## 功能摘要

首页功能横向滚动展示区，桌面端 6 个功能卡片横向排列，随页面滚动水平移动并显示进度条。

## 关键实现细节

- **桌面端横向滚动**：ScrollTrigger pin + scrub，track 水平位移，进度条实时更新
- **移动端**：退化为纵向 2 列网格
- **功能卡片**：每个含 SVG 插图、图标、中英文标题、描述
- **6 个功能**：精准转录、智能缓存、要点提取、对话问答、单词句子本、接口可替换
- **进度条**：底部 2px 蓝色进度条跟随滚动百分比

## 依赖关系

- `gsap`、`@gsap/react`、`gsap/ScrollTrigger`
- `lucide-react`（FileText、Zap、Lightbulb、MessageSquare、Sparkles、BookOpen）

## 关联模块

- 首页功能展示区
