# video-player.tsx

**文件路径**：`components/video-player.tsx`

## 功能摘要

YouTube IFrame 嵌入播放器，通过 forwardRef 暴露 seekTo 和 getCurrentTime 方法供父组件控制。

## 关键实现细节

- **Props**：`videoId`、`metadata?: VideoMetadata`
- **Handle**：`VideoPlayerHandle` 类型，`seekTo(seconds)` 和 `getCurrentTime()` 方法
- **API 加载**：动态创建 `<script>` 加载 YouTube IFrame API，`onYouTubeIframeAPIReady` 回调初始化 Player
- **useImperativeHandle**：将 playerRef 的方法暴露给父组件
- **播放器配置**：`enablejsapi=1`，allow 含 accelerometer、autoplay、clipboard-write 等
- **元数据展示**：标题 + 频道名 Badge，边框上方圆角视频、下方信息区

## 依赖关系

- `@/components/ui/badge`
- `@/lib/types`（VideoMetadata）
- React `forwardRef`、`useImperativeHandle`

## 关联模块

- `video-workspace.tsx` 通过 ref 控制播放跳转
