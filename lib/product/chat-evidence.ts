import type { TranscriptSegment } from "@/lib/types";

type Citation = { startTime: number; endTime: number; quote: string };

const STOPWORDS = new Set(["the", "what", "which", "when", "where", "with", "from", "that", "this", "does", "did", "are", "was", "how", "why", "who", "and", "for", "about", "video", "speaker", "minute"]);

function tokens(value: string) {
  const normalized = value.toLowerCase();
  const latin = normalized.match(/[a-z0-9]{3,}/g) ?? [];
  const chinese = normalized.match(/[\u4e00-\u9fff]+/g) ?? [];
  const chinesePhrases = chinese.flatMap((phrase) => {
    const phrases: string[] = [];
    for (let size = 2; size <= Math.min(6, phrase.length); size += 1) {
      for (let start = 0; start + size <= phrase.length; start += 1) {
        phrases.push(phrase.slice(start, start + size));
      }
    }
    return phrases;
  });
  return [...new Set([...latin, ...chinesePhrases].filter((token) => !STOPWORDS.has(token)))];
}

function score(questionTokens: string[], text: string) {
  const normalized = text.toLowerCase();
  return questionTokens.reduce((total, token) => total + (normalized.includes(token) ? 1 : 0), 0);
}

export function selectChatEvidence(question: string, transcript: TranscriptSegment[]) {
  const questionTokens = tokens(question);
  const rankedIndexes = transcript
    .map((segment, index) => ({ index, score: score(questionTokens, segment.text) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 4)
    .map(({ index }) => index);
  const contextualIndexes = new Set(rankedIndexes);
  for (const index of rankedIndexes) {
    const previous = transcript[index - 1];
    const current = transcript[index];
    const next = transcript[index + 1];
    if (previous && current.startTime - previous.endTime <= 90) contextualIndexes.add(index - 1);
    if (next && next.startTime - current.endTime <= 90) contextualIndexes.add(index + 1);
  }
  const indexes = [...contextualIndexes].sort((a, b) => a - b).slice(0, 12);
  return { found: indexes.length > 0, segments: indexes.map((index) => transcript[index]) };
}

export function validateChatCitations(citations: Citation[], transcript: TranscriptSegment[]): Citation[] {
  return citations.flatMap((citation) => {
    const quote = citation.quote.trim();
    const match = transcript.find((segment) => segment.text.toLowerCase().includes(quote.toLowerCase()));
    return match ? [{ startTime: match.startTime, endTime: match.endTime, quote: match.text.slice(0, 220) }] : [];
  }).slice(0, 5);
}
