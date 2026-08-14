import { type TranscriptSegment } from "@/lib/types";

export interface LexicalDifficultyPortrait {
  a1a2: number;       // 初级词汇占比 (0.0 - 1.0)
  b1b2: number;       // 中级/四六级词汇占比
  c1c2: number;       // 高级/雅思托福词汇占比
  unranked: number;   // 未分类词汇占比
}

export interface DifficultyAnalysisResult {
  portrait: LexicalDifficultyPortrait;
  heatmap: number[]; // 每 10 秒为一个 Slot 的中高级生词密度数组
}

// 核心中高级学术与专业词汇词库标杆 (轻量精选 Set)
const ACADEMIC_WORDS = new Set([
  "normalize", "dynamic", "visual", "premium", "sequence", "gesture", "haptic", "friction", 
  "transcode", "asynchronous", "render", "glow", "buffer", "compress", "bubble", "elastica",
  "tactile", "coordinate", "segment", "metadata", "redirect", "cache", "token", "auth",
  "resolution", "endpoint", "synchronize", "portrait", "heatmap", "active", "spring",
  "damping", "stiffness", "linear", "friction", "inertia", "collision", "feedback",
  "amplitude", "frequency", "specular", "diffuse", "ambient", "refraction", "velocity"
]);

// 高阶词根特征前缀与后缀 (用于规则引擎分类)
const HIGH_LEVEL_SUFFIXES = [
  "morphism", "ation", "ology", "ability", "graphy", "meter", "scope", "trans", "syn", "asyn",
  "anti", "semi", "multi", "pseudo", "proto", "micro", "macro", "ultra", "hyper", "poly"
];

/**
 * 判定单词的 CEFR 语言难度级别
 * 0: A1-A2 (初级)
 * 1: B1-B2 (中级)
 * 2: C1-C2 (高级/学术词汇)
 */
function evaluateWordLevel(word: string): 0 | 1 | 2 {
  const normalized = word.toLowerCase().trim().replace(/[^a-z]/g, "");
  
  if (normalized.length <= 4) {
    return 0; // 短词默认为基础 A1-A2 词汇
  }

  // 1. 先匹配核心学术 Set
  if (ACADEMIC_WORDS.has(normalized)) {
    return 2;
  }

  // 2. 匹配高级词根特征 (规则引擎)
  for (const suffix of HIGH_LEVEL_SUFFIXES) {
    if (normalized.endsWith(suffix) || normalized.startsWith(suffix)) {
      return 2;
    }
  }

  // 3. 常见较长词汇判定为中级 B1-B2
  if (normalized.length >= 7) {
    return 1;
  }

  return 0;
}

export class VideoDifficultyAnalyzer {
  /**
   * 分析字幕全文，生成视频词汇难度画像与 10s 生词密度热力图
   * @param transcript 字幕分句数组
   * @param totalDuration 视频总时长 (秒)
   */
  public static analyze(transcript: TranscriptSegment[], totalDuration: number): DifficultyAnalysisResult {
    if (transcript.length === 0 || totalDuration <= 0) {
      return {
        portrait: { a1a2: 1.0, b1b2: 0.0, c1c2: 0.0, unranked: 0.0 },
        heatmap: []
      };
    }

    // 1. 初始化 10 秒时间槽的生词密度热力图 (Heatmap)
    const slotCount = Math.max(1, Math.ceil(totalDuration / 10));
    const heatmap = new Array<number>(slotCount).fill(0);

    let countA1A2 = 0;
    let countB1B2 = 0;
    let countC1C2 = 0;
    let countUnranked = 0;
    let totalWords = 0;

    // 2. 遍历分句提取单词
    for (const segment of transcript) {
      const words = segment.text
        .normalize("NFKC")
        .replace(/[^A-Za-z\s']/g, "")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(Boolean);

      let lineHardWordsCount = 0;

      for (const word of words) {
        if (/^[A-Za-z'-]+$/.test(word)) {
          totalWords++;
          const level = evaluateWordLevel(word);
          
          if (level === 0) {
            countA1A2++;
          } else if (level === 1) {
            countB1B2++;
            lineHardWordsCount++;
          } else if (level === 2) {
            countC1C2++;
            lineHardWordsCount += 2; // 高级词在热力图中计双倍权重
          }
        } else {
          countUnranked++;
        }
      }

      // 3. 如果本句中包含中高级生词，将其累加进对应的时间槽内
      if (lineHardWordsCount > 0) {
        // 取该句子的中点时间作为发生区间
        const midTime = (segment.startTime + segment.endTime) / 2;
        const slotIdx = Math.min(slotCount - 1, Math.max(0, Math.floor(midTime / 10)));
        heatmap[slotIdx] += lineHardWordsCount;
      }
    }

    // 4. 计算最终画像占比 (Portrait)
    const validTotal = Math.max(1, totalWords + countUnranked);
    const portrait: LexicalDifficultyPortrait = {
      a1a2: Number((countA1A2 / validTotal).toFixed(3)),
      b1b2: Number((countB1B2 / validTotal).toFixed(3)),
      c1c2: Number((countC1C2 / validTotal).toFixed(3)),
      unranked: Number((countUnranked / validTotal).toFixed(3))
    };

    console.log(`[Bili:Analyzer] 难度分析完成：A1A2=${portrait.a1a2}, B1B2=${portrait.b1b2}, C1C2=${portrait.c1c2}, 共划分了 ${slotCount} 个 10s 时间轴热力槽`);

    return {
      portrait,
      heatmap
    };
  }
}
