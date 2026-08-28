import { useCallback, useEffect, useRef, useState } from "react";
import type { TpPracticeKind } from "@/lib/tp-practice";
import { type MockWord, type MockSentence } from "@/lib/mock-data";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface QuestionData {
  sample: string;
  correctAnswer: string;
  choices: string[];
  extraZh?: string;
  storyTokens?: string[];
  blankIndex?: number;
  wordRef?: MockWord;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_WORDS_DICT = [
  "v. 获得，学到；取得",
  "adj. 认知的，认知能力的",
  "n. 自律，纪律；学科",
  "v. 拖延，耽搁，延迟行动",
  "adj. 有弹性的，有韧性的",
  "v. 优化，使完美，使最完善",
  "n. 保留，保持，记忆力",
  "n. 正念，专注，静心",
  "n. 协同效应，增效作用",
  "n. 范式，典范，样板",
  "adj. 可持续的，可长期维持的",
  "adj. 脆弱的，易受伤害的",
  "adj. 一丝不苟的，极仔细的",
  "adj. 务实的，重实效的",
  "n. 同理心，共鸣，神会",
  "n. 正直，诚实正直；完整",
  "adj. 大胆的，敢于冒险的",
  "adj. 内在的，固有的，本质的",
  "adj. 无处不在的，普遍存在的",
  "adj. 美学的，审美的",
  "n. 模棱两可，不明确，含糊",
  "adj. 主要的，首要的；优质的",
  "n. 谚语，格言，警句"
];

const REAL_LISTENING_PHRASES = [
  { phrase: "active recall", translation: "主动回忆" },
  { phrase: "break the ice", translation: "打破沉默，开场" },
  { phrase: "think outside the box", translation: "跳出思维定势，创新思考" },
  { phrase: "bite the bullet", translation: "咬紧牙关，硬着头皮应付" },
  { phrase: "burn the midnight oil", translation: "开夜车，挑灯夜战" },
  { phrase: "cost an arm and a leg", translation: "极其昂贵，花大笔钱" },
  { phrase: "hit the nail on the head", translation: "一针见血，说得完全正确" },
  { phrase: "piece of cake", translation: "小菜一碟，非常容易的事" },
  { phrase: "take it with a grain of salt", translation: "持保留态度地听，不可全信" },
  { phrase: "under the weather", translation: "身体不舒服，微恙" },
  { phrase: "cut corners", translation: "投机取巧，走捷径" },
  { phrase: "read between the lines", translation: "读懂字里行间的深意，体会弦外之音" },
  { phrase: "spill the beans", translation: "泄露秘密，说漏嘴" },
  { phrase: "through thick and thin", translation: "共同经历风风雨雨，在任何情况下" },
  { phrase: "out of the blue", translation: "出乎意料，突然之间" },
  { phrase: "pull yourself together", translation: "冷静下来，振作起来" },
  { phrase: "keep your chin up", translation: "不要气馁，抬起头来" },
  { phrase: "on the same page", translation: "达成共识，想法一致" },
  { phrase: "best of both worlds", translation: "两全极美，两方面的好处都占了" },
  { phrase: "cry over spilt milk", translation: "为无可挽回的往事做无益的悲伤" }
];

const STORY_DISTRACTORS = [
  "achieve", "discipline", "strategy", "optimize", "retention",
  "habits", "identity", "mindfulness", "resilient", "excellence",
  "focus", "action", "wisdom", "technique", "process", "capacity"
];

const SAFE_FALLBACK_WORD: MockWord = {
  id: "fallback-practice-word",
  lemma: "practice",
  phonetic: "/ˈpræktɪs/",
  definitionZh: "练习；实践",
  definitionEn: "repeated training to improve a skill",
  exampleEn: "Daily practice makes progress visible.",
  exampleZh: "每天练习会让进步变得清晰可见。",
  occurrences: 1,
  date: new Date().toISOString().split("T")[0],
  isFavorite: false,
};

const SAFE_FALLBACK_SENTENCE: MockSentence = {
  id: "fallback-practice-sentence",
  text: "Daily practice makes progress visible.",
  translation: "每天练习会让进步变得清晰可见。",
  sourceVideoTitle: "Teach Player 练习",
  sourceVideoId: "fallback",
  collectedAt: new Date().toISOString().split("T")[0],
  isFavorite: false,
  tags: ["练习"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cleanDefinition(def?: string) {
  if (!def) return "";
  return def.split("\n")[0].split("；")[0].split(";")[0];
}

function pickDistractors(
  pool: MockWord[],
  chosen: MockWord,
  correctAns: string,
): string[] {
  const distractors: string[] = [];
  const candidates = pool.length > 0 ? pool : [SAFE_FALLBACK_WORD];
  const maxAttempts = 50;
  let attempts = 0;
  while (distractors.length < 2 && attempts < maxAttempts) {
    attempts++;
    const rWord = candidates[Math.floor(Math.random() * candidates.length)];
    const rDef = cleanDefinition(rWord.definitionZh);
    if (rWord.lemma !== chosen.lemma && rDef !== correctAns && !distractors.includes(rDef) && rDef) {
      distractors.push(rDef);
    }
    if (distractors.length < 2) {
      const randDef = FALLBACK_WORDS_DICT[Math.floor(Math.random() * FALLBACK_WORDS_DICT.length)];
      if (randDef !== correctAns && !distractors.includes(randDef)) {
        distractors.push(randDef);
      }
    }
  }
  if (distractors.length < 2) {
    for (const fallback of ["暂未提供释义", "与当前单词无关的释义"]) {
      if (fallback !== correctAns && !distractors.includes(fallback)) {
        distractors.push(fallback);
      }
      if (distractors.length === 2) break;
    }
  }
  return distractors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useQuestionGenerator({
  moduleId,
  vocabularyPool,
  sentencesPool,
  phrases,
  mistakes,
  accessToken,
  onlineQuotes,
}: {
  moduleId: TpPracticeKind;
  vocabularyPool: MockWord[];
  sentencesPool: MockSentence[];
  phrases: any[];
  mistakes: MockWord[];
  accessToken: string | null;
  onlineQuotes: any[] | undefined;
}) {
  const [loading, setLoading] = useState(true);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const generate = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setLoading(true);
    setQuestionData(null);

    timerRef.current = setTimeout(() => {
      try {
        const availableWords = vocabularyPool.length > 0 ? vocabularyPool : [SAFE_FALLBACK_WORD];
        const availableSentences = sentencesPool.length > 0 ? sentencesPool : [SAFE_FALLBACK_SENTENCE];

        if (moduleId === "words" || moduleId === "mistakes") {
          const pool = moduleId === "mistakes" && mistakes.length > 0 ? mistakes : availableWords;
          const chosen = pool[Math.floor(Math.random() * pool.length)] ?? SAFE_FALLBACK_WORD;
          const correctAns = cleanDefinition(chosen.definitionZh) || "暂未提供释义";
          const distractors = pickDistractors(pool, chosen, correctAns);
          setQuestionData({
            sample: chosen.lemma,
            correctAnswer: correctAns,
            choices: shuffleArray([correctAns, ...distractors]),
            wordRef: chosen,
          });

        } else if (moduleId === "listening") {
          const hasDbQuotes = accessToken && onlineQuotes && onlineQuotes.length > 0;
          const rawPool = hasDbQuotes
            ? sentencesPool.map(q => ({ phrase: q.text, translation: q.translation }))
            : (phrases.length > 0 ? phrases : REAL_LISTENING_PHRASES);
          const pool = rawPool.filter((item) => item && typeof item.phrase === "string" && item.phrase.trim().length > 0);
          const safePool = pool.length > 0 ? pool : REAL_LISTENING_PHRASES;
          const chosen = safePool[Math.floor(Math.random() * safePool.length)] ?? REAL_LISTENING_PHRASES[0];
          const correctAns = chosen.phrase;
          const distractors: string[] = [];
          let attempts = 0;
          while (distractors.length < 2 && attempts < 50) {
            attempts++;
            const rPhrase = safePool[Math.floor(Math.random() * safePool.length)].phrase;
            if (rPhrase !== correctAns && !distractors.includes(rPhrase)) {
              distractors.push(rPhrase);
            }
            if (distractors.length < 2) {
              const randPhrase = REAL_LISTENING_PHRASES[Math.floor(Math.random() * REAL_LISTENING_PHRASES.length)].phrase;
              if (randPhrase !== correctAns && !distractors.includes(randPhrase)) {
                distractors.push(randPhrase);
              }
            }
          }
          setQuestionData({
            sample: chosen.phrase,
            correctAnswer: correctAns,
            choices: shuffleArray([correctAns, ...distractors]),
            extraZh: chosen.translation,
          });

        } else if (moduleId === "speaking") {
          const chosen = availableSentences[Math.floor(Math.random() * availableSentences.length)] ?? SAFE_FALLBACK_SENTENCE;
          setQuestionData({
            sample: chosen.text,
            correctAnswer: chosen.text,
            choices: [],
            extraZh: chosen.translation,
          });

        } else if (moduleId === "stories") {
          const chosen = availableSentences[Math.floor(Math.random() * availableSentences.length)] ?? SAFE_FALLBACK_SENTENCE;
          const rawTokens = chosen.text.split(" ");
          const candidateIndices: number[] = [];
          const favoriteLemmas = new Set(vocabularyPool.map(w => w.lemma.toLowerCase().trim()));

          const favoriteIndices: number[] = [];
          rawTokens.forEach((token, idx) => {
            const cleanWord = token.replace(/[^a-zA-Z]/g, "").toLowerCase().trim();
            if (cleanWord.length >= 4) {
              candidateIndices.push(idx);
              if (favoriteLemmas.has(cleanWord)) {
                favoriteIndices.push(idx);
              }
            }
          });

          let blankIdx = -1;
          if (favoriteIndices.length > 0) {
            blankIdx = favoriteIndices[Math.floor(Math.random() * favoriteIndices.length)];
          } else if (candidateIndices.length > 0) {
            blankIdx = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
          } else {
            blankIdx = Math.floor(rawTokens.length / 2);
          }

          const correctWord = rawTokens[blankIdx].replace(/[^a-zA-Z]/g, "");
          const displayTokens = [...rawTokens];
          displayTokens[blankIdx] = "____";

          const filteredDistractors = STORY_DISTRACTORS.filter(d => d.toLowerCase() !== correctWord.toLowerCase());
          const shuffledDist = shuffleArray(filteredDistractors).slice(0, 2);

          setQuestionData({
            sample: chosen.text,
            correctAnswer: correctWord,
            choices: shuffleArray([correctWord, ...shuffledDist]),
            storyTokens: displayTokens,
            blankIndex: blankIdx,
            extraZh: chosen.translation,
          });
        }
      } catch (err) {
        console.error("Failed to generate question:", err);
        setQuestionData(null);
      } finally {
        timerRef.current = null;
        setLoading(false);
      }
    }, 150);
  }, [moduleId, vocabularyPool, sentencesPool, phrases, mistakes, accessToken, onlineQuotes]);

  return { loading, questionData, generate };
}
