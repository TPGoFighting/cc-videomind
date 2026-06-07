import type { TranscriptSegment } from "@/lib/types";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "shall", "can", "need",
  "dare", "ought", "used", "it", "its", "this", "that", "these", "those",
  "i", "you", "he", "she", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "our", "their", "mine", "yours", "hers", "ours",
  "theirs", "not", "no", "nor", "so", "if", "then", "than", "too", "very",
  "just", "about", "above", "after", "again", "all", "also", "any", "because",
  "before", "between", "both", "but", "each", "even", "every", "few", "here",
  "how", "into", "more", "most", "now", "only", "other", "off", "out",
  "over", "same", "some", "such", "there", "through", "under", "up", "what",
  "when", "where", "which", "while", "who", "why", "yeah", "yes", "okay",
  "um", "uh", "er", "oh", "ah", "well", "actually", "basically", "literally",
  "really", "right", "got", "get", "gonna", "wanna", "like", "go", "going",
  "lot", "let", "kind", "sort", "much", "many", "way", "thing", "things",
  "something", "anything", "nothing", "everything"
]);

/** 简单词形还原：处理常见屈折变化 */
export function lemmatizeWord(word: string): string {
  const lower = word.toLowerCase().trim();
  if (lower.length <= 2) return lower;

  // 常见不规则形式
  const IRREGULAR: Record<string, string> = {
    "running": "run", "runs": "run", "ran": "run",
    "taking": "take", "takes": "take", "took": "take", "taken": "take",
    "making": "make", "makes": "make", "made": "make",
    "going": "go", "goes": "go", "went": "go", "gone": "go",
    "doing": "do", "does": "do", "did": "do", "done": "do",
    "having": "have", "has": "have", "had": "have",
    "being": "be", "is": "be", "are": "be", "was": "be", "were": "be", "been": "be",
    "saying": "say", "says": "say", "said": "say",
    "getting": "get", "gets": "get", "got": "get",
    "coming": "come", "comes": "come", "came": "come",
    "seeing": "see", "sees": "see", "saw": "see", "seen": "see",
    "thinking": "think", "thinks": "think", "thought": "think",
    "knowing": "know", "knows": "know", "knew": "know", "known": "know",
    "giving": "give", "gives": "give", "gave": "give", "given": "give",
    "finding": "find", "finds": "find", "found": "find",
    "telling": "tell", "tells": "tell", "told": "tell",
    "working": "work", "works": "work",
    "calling": "call", "calls": "call",
    "trying": "try", "tries": "try", "tried": "try",
    "leaving": "leave", "leaves": "leave", "left": "leave",
    "feeling": "feel", "feels": "feel", "felt": "feel",
    "putting": "put", "puts": "put",
    "meaning": "mean", "means": "mean", "meant": "mean",
    "keeping": "keep", "keeps": "keep", "kept": "keep",
    "letting": "let", "lets": "let",
    "beginning": "begin", "begins": "begin", "began": "begin", "begun": "begin",
    "showing": "show", "shows": "show", "showed": "show", "shown": "show",
    "hearing": "hear", "hears": "hear", "heard": "hear",
    "playing": "play", "plays": "play",
    "reading": "read", "reads": "read",
    "living": "live", "lives": "live",
    "moving": "move", "moves": "move",
    "bringing": "bring", "brings": "bring", "brought": "bring",
    "happening": "happen", "happens": "happen",
    "writing": "write", "writes": "write", "wrote": "write", "written": "write",
    "sitting": "sit", "sits": "sit", "sat": "sit",
    "standing": "stand", "stands": "stand", "stood": "stand",
    "losing": "lose", "loses": "lose", "lost": "lose",
    "paying": "pay", "pays": "pay", "paid": "pay",
    "meeting": "meet", "meets": "meet", "met": "meet",
    "setting": "set", "sets": "set",
    "changing": "change", "changes": "change",
    "becoming": "become", "becomes": "become", "became": "become",
    "understanding": "understand", "understands": "understand", "understood": "understand",
    "people": "person",
    "better": "good", "best": "good",
    "bigger": "big", "biggest": "big",
    "looking": "look", "looks": "look",
    "using": "use", "uses": "use",
    "talking": "talk", "talks": "talk",
    "watching": "watch", "watches": "watch",
    "buying": "buy", "buys": "buy", "bought": "buy",
    "selling": "sell", "sells": "sell", "sold": "sell",
    "eating": "eat", "eats": "eat", "ate": "eat",
    "drinking": "drink", "drinks": "drink", "drank": "drink",
    "sleeping": "sleep", "sleeps": "sleep", "slept": "sleep",
    "driving": "drive", "drives": "drive", "drove": "drive", "driven": "drive",
    "building": "build", "builds": "build", "built": "build",
    "falling": "fall", "falls": "fall", "fell": "fall",
    "breaking": "break", "breaks": "break", "broke": "break", "broken": "break",
    "creating": "create", "creates": "create",
    "asking": "ask", "asks": "ask",
    "walking": "walk", "walks": "walk",
    "waiting": "wait", "waits": "wait",
    "spending": "spend", "spends": "spend", "spent": "spend",
    "learning": "learn", "learns": "learn",
    "teaching": "teach", "teaches": "teach", "taught": "teach",
    "cutting": "cut", "cuts": "cut",
    "hitting": "hit", "hits": "hit",
    "winning": "win", "wins": "win", "won": "win",
    "holding": "hold", "holds": "hold", "held": "hold",
    "opening": "open", "opens": "open",
    "closing": "close", "closes": "close",
    "starting": "start", "starts": "start",
    "stopping": "stop", "stops": "stop",
  };

  if (lower in IRREGULAR) return IRREGULAR[lower];

  // 规则屈折变化
  if (lower.endsWith("ing")) {
    const base = lower.slice(0, -3);
    if (base.endsWith("nn") || base.endsWith("tt") || base.endsWith("mm")) {
      return base.slice(0, -1); // running → run, sitting → sit
    }
    if (base.endsWith("iz") || base.endsWith("is")) return base + "e"; // realizing → realize
    if (base.endsWith("at") || base.endsWith("it")) return base + "e"; // creating → create
    if (base.endsWith("e")) return base.slice(0, -1); // leaving → leav? no, need careful
    if (base.length >= 4) return base; // playing → play
  }

  if (lower.endsWith("ies") && lower.length > 4) return lower.slice(0, -3) + "y"; // studies → study
  if (lower.endsWith("es") && !lower.endsWith("ees")) {
    const base = lower.slice(0, -2);
    if (base.endsWith("sh") || base.endsWith("ch") || base.endsWith("ss") || base.endsWith("x") || base.endsWith("zz")) {
      return base; // watches → watch
    }
  }
  if (lower.endsWith("s") && !lower.endsWith("ss") && lower.length > 4) {
    const base = lower.slice(0, -1);
    if (base.endsWith("e")) return lower.slice(0, -1); // likes → like
    return base; // works → work
  }
  if (lower.endsWith("ed") && lower.length > 4) {
    const base = lower.slice(0, -2);
    if (base.endsWith("i")) return base.slice(0, -1) + "y"; // tried → try
    if (base.endsWith("e")) return base.slice(0, -1); // liked → like
    return base; // worked → work
  }
  if (lower.endsWith("ly") && lower.length > 4) return lower.slice(0, -2); // quickly → quick
  if (lower.endsWith("er")) {
    const base = lower.slice(0, -2);
    if (base.endsWith("i")) return base.slice(0, -1) + "y"; // happier → happy
    if (base.endsWith("gg") || base.endsWith("tt")) return base.slice(0, -1);
    return base;
  }
  if (lower.endsWith("est")) {
    const base = lower.slice(0, -3);
    if (base.endsWith("i")) return base.slice(0, -1) + "y"; // happiest → happy
    return base;
  }

  return lower;
}

/** 判断一个 token 是否是非单词字符 */
function isNonWord(token: string): boolean {
  return /^[^a-zA-Z]+$/.test(token);
}

/** 从 TranscriptSegment[] 中提取去重后的 lemma 列表 */
export function extractLemmas(segments: TranscriptSegment[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const seg of segments) {
    const token = seg.text.trim();
    if (!token) continue;

    // 按单词边界切分
    const words = token.split(/[\s–—…,.!?;:'"()\[\]{}<>\/\\|`~@#$%^&*+=_-]+/);

    for (const raw of words) {
      const w = raw.trim();
      if (!w || w.length < 2 || isNonWord(w)) continue;

      const lemma = lemmatizeWord(w);
      if (!lemma || lemma.length < 2) continue;
      if (STOP_WORDS.has(lemma)) continue;

      if (!seen.has(lemma)) {
        seen.add(lemma);
        result.push(lemma);
      }
    }
  }

  return result;
}
