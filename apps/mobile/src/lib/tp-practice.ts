export type TpPracticeKind = "speaking" | "listening" | "mistakes" | "words" | "stories";

export type TpPracticeModule = {
  id: TpPracticeKind;
  title: string;
  subtitle: string;
  accent: string;
  reward: number;
  prompt: string;
  sample: string;
  options: string[];
};

export const TP_PRACTICE_MODULES: TpPracticeModule[] = [
  {
    id: "speaking",
    title: "口语",
    subtitle: "跟读、复述、语音影子练习",
    accent: "#10B981",
    reward: 18,
    prompt: "跟读句子，注意重音和连读",
    sample: "Practice makes permanent.",
    options: ["跟读 3 遍", "录音对比", "节奏评分"],
  },
  {
    id: "listening",
    title: "听力",
    subtitle: "听音辨词、句子听写、关键词捕捉",
    accent: "#FF6B6B",
    reward: 16,
    prompt: "听一段音频，选出你听到的关键词",
    sample: "active recall",
    options: ["active recall", "actual record", "actor control"],
  },
  {
    id: "mistakes",
    title: "错题本",
    subtitle: "集中重练薄弱词和错过的句子",
    accent: "#FF9F1C",
    reward: 14,
    prompt: "把最近答错的题重新过一遍",
    sample: "prime / primary / primarily",
    options: ["重新选择", "看解析", "加入复习队列"],
  },
  {
    id: "words",
    title: "单词",
    subtitle: "闪卡、释义选择、拼写巩固",
    accent: "#1CB0F6",
    reward: 20,
    prompt: "选择最贴近单词含义的解释",
    sample: "retention",
    options: ["保留；记忆保持", "拒绝；反对", "恢复；修复"],
  },
  {
    id: "stories",
    title: "句子补全",
    subtitle: "读懂句意，补全缺失的生词和关键表达",
    accent: "#B76CFD",
    reward: 22,
    prompt: "根据中文释义，选出最适合的生词补全句子",
    sample: "Mina used active recall before the exam.",
    options: ["补词", "排序", "复述"],
  },
];

export function getTpPracticeModule(kind?: string | string[]) {
  const normalized = Array.isArray(kind) ? kind[0] : kind;
  return TP_PRACTICE_MODULES.find((module) => module.id === normalized) ?? TP_PRACTICE_MODULES[0];
}
