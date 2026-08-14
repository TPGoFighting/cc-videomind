# app/globals.css

**文件路径**：`app/globals.css`

**功能摘要**：全局样式表，定义 Tailwind CSS 基础、Framer 风格暗黑色彩系统、自定义工具类和动画。

## 关键实现细节

### 色彩系统（CSS 变量）
- 主色：`--primary: 205 100% 50%`（Framer Blue #0099ff）
- 特殊色：`--framer-blue`、`--framer-frosted`、`--framer-surface`、`--framer-silver`

### 字体栈
- 中文：PingFang SC / Noto Sans SC / Microsoft YaHei
- 等宽：JetBrains Mono / Cascadia Code

### 自定义工具类
- `.frosted` / `.frosted-hover` — 毛玻璃效果
- `.ring-blue` — 蓝色聚焦环
- `.elevate-card` — 卡片阴影
- `.text-gradient` — 渐变文字（蓝→紫）
- `.glass` / `.glass-hover` — 毛玻璃卡片
- `.perspective-card` — 3D 透视容器
- `.card-lift` — 卡片悬浮提升
- `.btn-press` — 按钮按压反馈
- `.input-glow` — 输入框聚焦光晕
- `.skeleton-wave` — 骨架屏波浪动画
- `.scrollbar-none` — 隐藏滚动条
- `.heading-compressed` — 中文大标题压缩
- `.touch-reveal` — 触屏友好操作按钮

### 动画
- `breathe` — 脉冲呼吸（加载态）
- `gradient-shift` — 渐变平移（标题文字）
- `skeleton-wave` — 骨架屏

### 无障碍
- `@media (prefers-reduced-motion: reduce)` — 减少动画偏好

## 依赖关系

- Tailwind CSS
- 无外部依赖

## 关联功能模块

- 全局应用样式
