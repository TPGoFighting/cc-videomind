import { createHash } from "crypto";
import { searchChunks, type StoredChunk } from "@/lib/embedding/vector-store";

/**
 * TODO: Replace with real embedding API (OpenAI text-embedding-3-small or Gemini embedding-001).
 * This is a deterministic pseudo-embedding for development/testing only.
 */
function pseudoEmbed(text: string): number[] {
  const hash = createHash("md5").update(text).digest();
  const embedding = new Array(1536).fill(0);
  for (let i = 0; i < 1536; i++) {
    embedding[i] = (hash[i % hash.length] / 255) * 2 - 1;
  }
  return embedding;
}

export interface RetrievedChunk {
  chunkIndex: number;
  segmentStart: number;
  segmentEnd: number;
  text: string;
  similarity: number;
}

export async function retrieveRelevantChunks(
  videoId: string,
  question: string,
  topK: number = 5,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = pseudoEmbed(question);

  const results: StoredChunk[] = await searchChunks(videoId, queryEmbedding, topK);

  return results.map(chunk => ({
    chunkIndex: chunk.chunk_index,
    segmentStart: chunk.segment_start,
    segmentEnd: chunk.segment_end,
    text: chunk.text,
    similarity: chunk.similarity ?? 0,
  }));
}
