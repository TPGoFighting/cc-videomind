# youtube-status-banner.tsx

**文件路径**：`components/youtube-status-banner.tsx`

## 功能摘要

YouTube 不可用/受限状态告警 Banner，支持 banner（全宽卡片）和 inline（紧凑行内）两种变体。

## 关键实现细节

- **Props**：`status: YouTubeStatus`、`variant?: "banner" | "inline"`
- **状态处理**：checking/available 时不渲染，dismissed 时隐藏
- **blocked**：YouTube 不可访问，提示使用代理/VPN
- **restricted**：YouTube 受限，提示登录 Google 账号并开启第三方 Cookie
- **banner 变体**：圆角卡片，带背景光晕装饰、图标、说明文字、"前往 YouTube 登录"和"忽略"按钮
- **inline 变体**：紧凑红色警告条，适合导航栏内嵌
- **dismissed**：关闭后不再显示

## 依赖关系

- `lucide-react`（AlertTriangle、ExternalLink、X）
- `@/lib/hooks/useYouTubeStatus`（YouTubeStatus 类型）
- `@/lib/utils/cn`

## 关联模块

- `navbar.tsx`（inline 变体）、`youtube-status-alert.tsx`（banner 变体）
