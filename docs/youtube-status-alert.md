# youtube-status-alert.tsx

**文件路径**：`components/youtube-status-alert.tsx`

## 功能摘要

YouTube 连通性告警的客户端包装器，获取状态后渲染 YouTubeStatusBanner。

## 关键实现细节

- 从 `useYouTubeStatus()` 获取状态
- 渲染 `<YouTubeStatusBanner status={status} variant="banner" />`

## 依赖关系

- `@/components/youtube-status-banner`
- `@/lib/hooks/useYouTubeStatus`

## 关联模块

- 首页顶部全局告警
