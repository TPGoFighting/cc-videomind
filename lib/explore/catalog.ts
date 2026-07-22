export type LearningTopic = "表达" | "习惯" | "技术";

export type LearningVideo = {
  videoId: string;
  title: string;
  creator: string;
  topic: LearningTopic;
  language: "英语";
  level: "建议中级" | "建议进阶";
  duration: string;
  captions: "英文字幕";
  outcome: string;
  sourceUrl: string;
  verifiedAt: string;
};

/**
 * Small, manually reviewed launch catalog. Deliberately stable: no client-side
 * oEmbed fetch, random trending content, or unverified learning metadata.
 */
export const LEARNING_CATALOG: readonly LearningVideo[] = [
  {
    videoId: "eIho2S0ZahI",
    title: "How to Speak So That People Want to Listen",
    creator: "Julian Treasure · TED",
    topic: "表达",
    language: "英语",
    level: "建议中级",
    duration: "9:59",
    captions: "英文字幕",
    outcome: "识别让表达更可信的习惯，并保存可复述的发声技巧。",
    sourceUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI",
    verifiedAt: "2026-07-22",
  },
  {
    videoId: "arj7oStGLkU",
    title: "Inside the Mind of a Master Procrastinator",
    creator: "Tim Urban · TED",
    topic: "习惯",
    language: "英语",
    level: "建议中级",
    duration: "14:04",
    captions: "英文字幕",
    outcome: "理解拖延的心理模型，并摘录讲者如何描述截止日期压力。",
    sourceUrl: "https://www.youtube.com/watch?v=arj7oStGLkU",
    verifiedAt: "2026-07-22",
  },
  {
    videoId: "LPZh9BOjkQs",
    title: "Large Language Models Explained Briefly",
    creator: "Grant Sanderson · 3Blue1Brown",
    topic: "技术",
    language: "英语",
    level: "建议进阶",
    duration: "7:00",
    captions: "英文字幕",
    outcome: "用英语建立 LLM、next-token prediction 与 transformer 的基础词汇。",
    sourceUrl: "https://www.youtube.com/watch?v=LPZh9BOjkQs",
    verifiedAt: "2026-07-22",
  },
] as const;

export const LEARNING_TOPICS = ["全部", "表达", "习惯", "技术"] as const;
