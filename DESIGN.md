# DESIGN.md

## Vision

这个网站不是传统意义上的 Portfolio。
它更像一个「数字人格容器」。

参考 [Victor Furuya Portfolio](https://victorfuruya.com/?utm_source=chatgpt.com) 的核心气质：

- 极简但不冷漠
- 高级感来自“节奏”而不是装饰
- 动效像呼吸，而不是炫技
- 页面是“流动”的，不是“切换”的
- 用户在浏览时会有一种：

> “我正在进入某个人的大脑。”

的感觉。 

------

# Design Philosophy

## 1. Motion First

动画不是附属品。
动画本身就是 UI。

页面中的每一次：

- hover
- scroll
- reveal
- transition
- parallax
- easing

都应该像电影镜头语言。

核心关键词：

- cinematic
- organic
- smooth
- tension
- invisible interaction

不要做“互联网感”。

要做：

> “未来操作系统感”。

------

## 2. Typography is the Interface

字体不是信息承载工具。
字体本身就是视觉主体。

设计原则：

- 超大标题
- 极少文字
- 强留白
- 高对比字号
- 使用字体层级创造空间感

推荐：

### Heading

- Neue Montreal
- Satoshi
- General Sans
- Suisse Intl

### Body

- Inter
- Manrope

风格：

- 超粗标题 + 超细辅助文本
- lowercase 优先
- letter spacing 微负值
- 行高宽松

参考：

- 日本设计杂志
- fashion editorial
- Apple keynote typography
- brutal minimalism ([CSS Winner](https://www.csswinner.com/details/motoi-furuya-portfolio-site/14551?utm_source=chatgpt.com))

------

# Color System

## Base Palette

```txt
Background: #050505
Primary Text: #F5F5F5
Secondary Text: #8A8A8A
Accent: #7C5CFF
Accent Glow: rgba(124,92,255,.35)
Card Border: rgba(255,255,255,.08)
```

整体原则：

- 颜色数量 ≤ 3
- 不使用纯黑纯白
- 所有颜色偏“雾面”
- 高级感来自克制

------

# Layout Language

## Grid

使用：

- 12-column grid
- 大量 asymmetric layout
- broken alignment
- oversized whitespace

不要：

- 居中堆叠式 Landing Page
- SaaS 模板布局
- “标准互联网 Hero”

页面需要有：

> “呼吸感”。

------

# Interaction System

## Hover

hover 不只是 scale。

推荐组合：

- subtle translateY
- blur sharpen
- opacity fade
- image reveal
- magnetic cursor
- directional movement

hover duration:

```js
0.4s — 0.8s
```

easing：

```css
cubic-bezier(0.22, 1, 0.36, 1)
```

------

## Scroll

滚动是整个网站的“主叙事”。

推荐：

- smooth scroll
- inertia
- section pinning
- layered parallax
- stagger reveal
- kinetic typography

技术建议：

- GSAP ScrollTrigger
- Lenis
- Framer Motion

网站滚动时应该像：

> 在宇宙飞船里漂移。 🌌

------

# Hero Section

## Composition

Hero 不应该只是：

```txt
标题 + 按钮 + 插图
```

而应该像：

- 艺术装置
- 数字展厅
- 未来海报

推荐结构：

```txt
Left:
Huge typography
micro intro

Right:
interactive visual system
parallax media
3D object / video texture
```

视觉元素：

- noise texture
- glass blur
- floating grid
- grain
- cinematic shadow
- ambient glow

------

# Imagery Style

不要：

- stock photo
- 普通 UI mockup
- Dribbble 风素材

推荐：

- 抽象几何
- 建筑感构图
- 实验性排版
- XR / AI / cyberpunk visual
- 黑白摄影
- procedural graphics
- chrome material
- holographic surface

视觉关键词：

```txt
future
editorial
experimental
quiet luxury
neo-brutal
digital architecture
```

------

# Section Structure

## Recommended Sections

### 1. Hero

沉浸式第一屏。

目标：

> 3 秒内让用户意识到：
> “这个网站不一样。”

------

### 2. Selected Work

不是 project list。

而是：

- curated experiences
- cinematic showcase

每个项目像 Netflix 封面一样出现。 ([Reddit](https://www.reddit.com/r/web_design/comments/ph8fl4?utm_source=chatgpt.com))

支持：

- hover preview
- video reveal
- smooth expand
- fullscreen transition

------

### 3. Philosophy

不是 About Me。

而是：

- worldview
- creative thinking
- future imagination

内容可以极少。

但文字必须“有重量”。

------

### 4. Capabilities

技能展示不要做：

```txt
HTML
CSS
JS
```

这种新人简历风。

推荐：

```txt
creative development
motion systems
immersive interaction
ai-native products
xr experience design
```

------

### 5. Contact

Contact 页不要像表单系统。

更像：

> 一封来自未来的邀请函。

推荐：

- 巨型邮箱
- 动态背景
- ambient motion
- 微交互 hover

------

# Motion Rules

## IMPORTANT

动画必须：

- 慢
- 丝滑
- 有惯性
- 有重量

不要：

- 快速 bounce
- 夸张 elastic
- 廉价粒子特效
- 到处飞元素

高级网站的秘密：

> “它们动得很克制。”

------

# Sound Design (Optional)

如果做极致版本：

可以加入：

- hover ambient sound
- soft UI tick
- cinematic atmosphere
- scroll texture audio

但必须：

- 默认静音
- 极轻
- 不干扰

------

# Technical Stack

推荐：

## Frontend

- Next.js
- React
- TypeScript

## Animation

- GSAP
- Framer Motion
- Lenis

## 3D

- Three.js
- React Three Fiber

## Styling

- TailwindCSS
- SCSS Modules

------

# Performance Rules

再炫也必须：

- 60fps
- mobile smooth
- lazy load
- image optimization
- motion reduction support

因为：

> 卡顿会瞬间摧毁高级感。 💀

------

# UX Philosophy

这个网站不是为了：

- 快速成交
- SaaS 转化率
- SEO 内容农场

它是：

> “数字时代的个人电影。”

用户离开后应该记住的是：

- 气质
- 氛围
- 节奏
- 情绪

而不是：

“哦他会 React。”

------

# Final Direction

整体目标：

```txt
Apple 的克制
+
A24 的气质
+
Cyberpunk 的未来感
+
日本平面设计的留白
+
电影级动态语言
```

最终体验应该像：

> 一个来自 2035 年的创意开发者，
> 在互联网废墟里搭建的私人宇宙。 ✨

