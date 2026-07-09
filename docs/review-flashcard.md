# review-flashcard.tsx

**文件路径**：`components/review-flashcard.tsx`

## 功能摘要

3D 翻转闪卡组件，正面显示单词（lemma + 音标 + 词性），背面显示释义，翻转后显示四级评分按钮（忘了/模糊/记得/简单）。

## 关键实现细节

- **Props**：`word: ReviewWord`、`onRate: (quality: number) => void`、`disabled: boolean`
- **3D 翻转**：CSS perspective + GSAP rotationY 动画（0.55s power2.inOut）
- **评分按钮**：quality 值 0/2/3/5 对应 忘了/模糊/记得/简单，入场时 stagger 弹性动画
- **按钮按压效果**：GSAP scale 0.92 → 1 回弹
- **评分流程**：按钮先淡出 → 调用 onRate → 重置翻转状态
- **进度标签**：显示复习次数和状态（新词/复习中/已掌握）
- **卡片内容**：正面 lemma、phonetic、partOfSpeech；背面 definitionZh、definitionEn、exampleEn/Zh

## 依赖关系

- `gsap`、`@gsap/react`
- `lucide-react`（Zap、BookOpen、RotateCw、RotateCcw）
- `@/lib/types`（ReviewWord）
- `@/lib/utils/cn`

## 关联模块

- `/review` 复习页面使用
