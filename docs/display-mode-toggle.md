# display-mode-toggle.tsx

**文件路径**：`components/display-mode-toggle.tsx`

## 功能摘要

三态切换按钮组，用于切换转录文本的显示模式：英文（EN）、中英双语（中英）、中文（中文）。

## 关键实现细节

- **Props**：`value: DisplayMode`、`onChange: (mode: DisplayMode) => void`
- **模式选项**：`en`（EN）、`bilingual`（中英）、`zh`（中文）
- **UI**：圆角分段控件，选中态用品牌蓝背景 + 蓝色文字，未选中为白色半透明
- **无障碍**：每个按钮有 `type="button"` 防止表单提交

## 依赖关系

- `@/lib/utils/cn`（className 合并）
- `@/lib/types`（DisplayMode 类型）

## 关联模块

- `transcript-viewer.tsx` 中嵌入，控制转录文本的中英文显示
- `video-workspace.tsx` 管理 displayMode 状态并通过 `onDisplayModeChange` 传递
