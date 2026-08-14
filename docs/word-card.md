# word-card.tsx

**文件路径**：`components/word-card.tsx`

## 功能摘要

单词释义弹窗卡片，悬浮在转录文本上方，展示词典定义、音标、例句，支持收藏到单词本。

## 关键实现细节

- **Props**：`definition: WordDefinition`、`position: { top; left }`、`onClose`、`onSave?`、`onMouseEnter?`、`onMouseLeave?`
- **位置计算**：`getAdjustedPosition` 处理边界溢出，移动端居中显示
- **交互**：
  - 点击外部关闭（mousedown 监听）
  - ESC 键关闭
  - 移动端显示全屏遮罩层
  - 可移动到卡片上保持显示（onMouseEnter/onMouseLeave）
- **收藏**：BookmarkPlus 按钮，POST `/api/user-vocabulary`，成功后显示 Check 图标
- **内容展示**：lemma、phonetic、partOfSpeech、definitionZh、definitionEn、exampleEn/Zh

## 依赖关系

- `lucide-react`（BookmarkPlus、Check、X）
- `@/lib/types`（WordDefinition）
- `@/lib/utils/cn`

## 关联模块

- `transcript-viewer.tsx` 中按需渲染
