# transcript-viewer.tsx

**文件路径**：`components/transcript-viewer.tsx`

## 功能摘要

视频转录文本查看器，支持自动跟随播放位置滚动、中英双语显示、单词悬浮释义卡片、收藏句子功能。

## 关键实现细节

- **Props**：transcript、loading、currentTime、hideHeader、displayMode、onDisplayModeChange、wordDefinitions、onSaveWord、onSaveQuote、onSeekTo、translating
- **自动滚动**：comfort zone 算法将当前段落保持在视口 20%-40% 位置，用户手动滚动时暂停并显示"跳转到当前"按钮
- **programmaticScrolling**：通过 scrollend 事件 + 超时兜底精确管理，避免手动滚动被误判
- **单词交互**：
  - 桌面端：hover 0.5s 后显示 WordCard，延迟 300ms 关闭（可移动到卡片上取消）
  - 移动端：click 显示，带遮罩层
  - `lemmatizeWord` 将单词还原为词典形式
- **收藏句子**：每段转录有 Bookmark 按钮，POST `/api/user-quotes`
- **显示模式**：en/bilingual/zh 三种，`renderText` 函数将文本按单词边界拆分并为有释义的单词添加交互
- **中英翻译**：`needsTranslation` 检测是否需要懒加载翻译，翻译中显示脉冲提示

## 依赖关系

- `lucide-react`（Bookmark、BookmarkCheck、ListVideo、Navigation、Pin、PinOff）
- `@/components/ui/card`（Card、CardContent、CardHeader、CardTitle）
- `./display-mode-toggle`、`./word-card`
- `@/lib/types`（DisplayMode、TranscriptSegment、WordDefinition）
- `@/lib/utils/time`（formatTimestamp）
- `@/lib/utils/cn`
- `@/lib/utils/tokenize`（lemmatizeWord）

## 关联模块

- `sidebar-tabs.tsx`、`mobile-video-tabs.tsx` 中作为核心内容
- `video-workspace.tsx` 管理 currentTime 和 wordDefinitions
