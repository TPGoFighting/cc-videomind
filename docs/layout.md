# app/layout.tsx

**文件路径**：`app/layout.tsx`

**功能摘要**：应用根布局，配置全局 HTML 结构、元数据和上下文 Provider。

## 关键实现细节

### 元数据
- **标题**：`Teach Player — YouTube 视频 AI 学习工作区`
- **描述**：`粘贴 YouTube 链接，获取转录、摘要、时间戳要点和对话问答。所有分析基于视频真实内容。`

### HTML 结构
- `lang="zh-CN"` — 中文
- `className="dark"` — 暗色模式

### Provider 包裹
1. `AuthProvider` — 认证上下文
2. `GsapProvider` — GSAP 动画库
3. `MobileTabBarClient` — 移动端底部导航栏

## 依赖关系

| 模块 | 用途 |
|------|------|
| `@/components/auth-context` | 认证 Provider |
| `@/components/gsap-provider` | GSAP 动画 Provider |
| `@/components/mobile-tab-bar-client` | 移动端底部 Tab |
| `./globals.css` | 全局样式 |

## 关联功能模块

- 所有页面共享此布局
