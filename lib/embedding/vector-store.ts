import { query } from "@/lib/db";

export interface StoredChunk {
  id: string;
  chunk_index: number;
  segment_start: number;
  segment_end: number;
  text: string;
  similarity?: number;
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function storeChunks(
  videoId: string,
  chunks: Array<{ chunkIndex: number; segmentStart: number; segmentEnd: number; text: string }>,
  embeddings: number[][],
): Promise<void> {
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    await query(
      `INSERT INTO video_chunks (video_id, chunk_index, segment_start, segment_end, text, embedding)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (video_id, chunk_index) DO UPDATE SET
         segment_start = EXCLUDED.segment_start,
         segment_end = EXCLUDED.segment_end,
         text = EXCLUDED.text,
         embedding = EXCLUDED.embedding`,
      [videoId, c.chunkIndex, c.segmentStart, c.segmentEnd, c.text, JSON.stringify(embeddings[i])]
    );
  }
}

export async function searchChunks(
  videoId: string,
  queryEmbedding: number[],
  topK: number = 5,
): Promise<StoredChunk[]> {
  // Fetch all chunks for the video, compute similarity in JS (pgvector not available yet)
  const { rows } = await query<StoredChunk & { embedding: string }>(
    `SELECT id, chunk_index, segment_start, segment_end, text, embedding
     FROM video_chunks WHERE video_id = $1`,
    [videoId]
  );

  const scored = rows.map((row) => {
    const emb: number[] = row.embedding ? JSON.parse(row.embedding) : [];
    return {
      id: row.id,
      chunk_index: row.chunk_index,
      segment_start: row.segment_start,
      segment_end: row.segment_end,
      text: row.text,
      similarity: cosineSimilarity(queryEmbedding, emb),
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

export async function getChunksByVideo(videoId: string): Promise<StoredChunk[]> {
  const { rows } = await query<StoredChunk>(
    `SELECT id, chunk_index, segment_start, segment_end, text
     FROM video_chunks WHERE video_id = $1 ORDER BY chunk_index ASC`,
    [videoId]
  );
  return rows;
}

export async function deleteChunksByVideo(videoId: string): Promise<void> {
  await query(`DELETE FROM video_chunks WHERE video_id = $1`, [videoId]);
}
