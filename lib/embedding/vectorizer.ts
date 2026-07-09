import { createHash } from "crypto";
import type { TranscriptSegment } from "@/lib/types";
import { chunkTranscript } from "@/lib/embedding/chunker";
import { storeChunks } from "@/lib/embedding/vector-store";

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

export async function vectorizeTranscript(
  videoId: string,
  segments: TranscriptSegment[],
): Promise<void> {
  const chunks = chunkTranscript(segments);
  if (chunks.length === 0) return;

  const embeddings = chunks.map(chunk => pseudoEmbed(chunk.text));

  await storeChunks(videoId, chunks, embeddings);
}
