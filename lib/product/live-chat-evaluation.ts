import type { TranscriptSegment } from "@/lib/types";
import type { ChatAnswerFixture } from "./chat-answer-evaluation";

export type LiveChatEvaluationFixture = {
  id: string;
  question: string;
  transcript: TranscriptSegment[];
  expected: ChatAnswerFixture;
};

export function allowsLiveChatEvaluation(args: string[]): boolean {
  return args.includes("--allow-network");
}

export const LIVE_CHAT_EVALUATION_FIXTURES: LiveChatEvaluationFixture[] = [
  {
    id: "late-study-method",
    question: "Which study method is named at minute fifty-three and how does it work?",
    transcript: [
      { startTime: 0, endTime: 6, text: "The opening explains why habits are hard to change." },
      { startTime: 3180, endTime: 3192, text: "At minute fifty-three, the speaker names spaced repetition as the study method." },
      { startTime: 3200, endTime: 3210, text: "It works by revisiting material just before it is forgotten." },
    ],
    expected: {
      answerMustContain: ["spaced repetition", "revisit material"],
      citationMustContain: ["spaced repetition"],
    },
  },
  {
    id: "bilingual-retention",
    question: "间隔重复有什么作用？",
    transcript: [
      { startTime: 1800, endTime: 1810, text: "Spaced repetition means 间隔重复：在快忘记时复习。" },
      { startTime: 1811, endTime: 1820, text: "The speaker says it improves long-term retention, 长期记忆会更稳固。" },
    ],
    expected: {
      answerMustContain: ["间隔重复", "长期记忆"],
      citationMustContain: ["长期记忆"],
    },
  },
];
