import type {
  KeyMoment,
  SummaryTakeaway,
  TranscriptSegment,
  VideoAnalysis,
  VideoMetadata,
} from "@/lib/types";

export const WORKSPACE_FIXTURE_STATES = [
  "ready",
  "loading",
  "empty",
  "partial",
  "failure",
] as const;

export type WorkspaceFixtureState = (typeof WORKSPACE_FIXTURE_STATES)[number];

export function parseWorkspaceFixture(value: string | string[] | undefined) {
  if (typeof value !== "string") return undefined;
  return WORKSPACE_FIXTURE_STATES.find((state) => state === value);
}

export const WORKSPACE_FIXTURE = {
  metadata: {
    videoId: "eIho2S0ZahI",
    title: "How to Speak So That People Want to Listen",
    authorName: "Julian Treasure · TED",
    providerUrl: "https://www.youtube.com/watch?v=eIho2S0ZahI",
  } satisfies VideoMetadata,
  transcript: [
    {
      startTime: 0,
      endTime: 24,
      text: "The human voice: it is the instrument we all play.",
      text_zh: "人的声音，是我们每个人都会演奏的乐器。",
    },
    {
      startTime: 24,
      endTime: 52,
      text: "It is the most powerful sound in the world, probably.",
      text_zh: "它很可能是世界上最有力量的声音。",
    },
    {
      startTime: 52,
      endTime: 82,
      text: "And yet many people have the experience that people don't listen to them.",
      text_zh: "但许多人都有过说话无人倾听的经历。",
    },
    {
      startTime: 82,
      endTime: 112,
      text: "There are habits that we need to move away from.",
      text_zh: "有些表达习惯，是我们需要主动远离的。",
    },
  ] satisfies TranscriptSegment[],
  analysis: {
    summary: "A practical introduction to speaking habits that build trust and make an audience want to listen.",
    takeaways: [
      "Voice is a trainable instrument.",
      "Trust begins with the habits behind the words.",
      "Examples make abstract speaking advice memorable.",
    ],
    suggestedQuestions: [
      "Which speaking habit most affects trust?",
      "How does the speaker structure the opening?",
      "Which example could you reuse in your own words?",
    ],
    highlights: [
      { startTime: 0, endTime: 24, title: "Voice as an instrument", quote: "The human voice", reason: "Frames the core idea." },
      { startTime: 24, endTime: 52, title: "The power of sound", quote: "the most powerful sound", reason: "Raises the stakes." },
      { startTime: 82, endTime: 112, title: "Habits to change", quote: "habits that we need to move away from", reason: "Introduces the practical framework." },
    ],
  } satisfies VideoAnalysis,
  moments: [
    {
      title: "Voice as an instrument",
      title_zh: "把声音当作乐器",
      timestamp: "00:00-00:24",
      quote: "The human voice: it is the instrument we all play.",
      quote_zh: "人的声音，是我们每个人都会演奏的乐器。",
      reason: "This metaphor establishes the talk's central learning frame.",
      reason_zh: "这个比喻建立了整场演讲的学习框架。",
    },
    {
      title: "Habits shape attention",
      title_zh: "习惯影响倾听",
      timestamp: "01:22-01:52",
      quote: "There are habits that we need to move away from.",
      quote_zh: "有些表达习惯，是我们需要主动远离的。",
      reason: "It turns a broad promise into an actionable diagnosis.",
      reason_zh: "这里把抽象承诺转成了可行动的自我诊断。",
    },
  ] satisfies KeyMoment[],
  takeaways: [
    {
      label: "Opening frame",
      label_zh: "开场框架",
      insight: "A concrete metaphor gives listeners a model they can remember and repeat.",
      insight_zh: "具体的比喻让听众更容易记住并复述核心观点。",
      timestamps: ["00:00", "00:24"],
    },
    {
      label: "Behavior before technique",
      label_zh: "技巧之前先看习惯",
      insight: "Credibility depends on speaking habits before it depends on vocal technique.",
      insight_zh: "可信度首先来自表达习惯，其次才是声音技巧。",
      timestamps: ["01:22"],
    },
  ] satisfies SummaryTakeaway[],
} as const;
