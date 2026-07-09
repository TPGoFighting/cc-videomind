import { createSupabaseServiceClient } from "@/lib/supabase/server";

export interface StoredChunk {
  id: string;
  chunk_index: number;
  segment_start: number;
  segment_end: number;
  text: string;
  similarity?: number;
}

function getClient() {
  const client = createSupabaseServiceClient();
  if (!client) {
    throw new Error("Supabase service client is not configured.");
  }
  return client;
}

export async function storeChunks(
  videoId: string,
  chunks: Array<{ chunkIndex: number; segmentStart: number; segmentEnd: number; text: string }>,
  embeddings: number[][],
): Promise<void> {
  const client = getClient();

  const rows = chunks.map((chunk, i) => ({
    video_id: videoId,
    chunk_index: chunk.chunkIndex,
    segment_start: chunk.segmentStart,
    segment_end: chunk.segmentEnd,
    text: chunk.text,
    embedding: `[${embeddings[i].join(",")}]`,
  }));

  const { error } = await client
    .from("video_chunks")
    .upsert(rows, { onConflict: "video_id,chunk_index" });

  if (error) {
    throw new Error(`Failed to store chunks: ${error.message}`);
  }
}

export async function searchChunks(
  videoId: string,
  queryEmbedding: number[],
  topK: number = 5,
): Promise<StoredChunk[]> {
  const client = getClient();

  const { data, error } = await client.rpc("match_video_chunks", {
    p_video_id: videoId,
    p_query_embedding: `[${queryEmbedding.join(",")}]`,
    p_match_count: topK,
  });

  if (error) {
    throw new Error(`Failed to search chunks: ${error.message}`);
  }

  return (data ?? []) as StoredChunk[];
}

export async function getChunksByVideo(videoId: string): Promise<StoredChunk[]> {
  const client = getClient();

  const { data, error } = await client
    .from("video_chunks")
    .select("*")
    .eq("video_id", videoId)
    .order("chunk_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to get chunks: ${error.message}`);
  }

  return (data ?? []) as StoredChunk[];
}

export async function deleteChunksByVideo(videoId: string): Promise<void> {
  const client = getClient();

  const { error } = await client
    .from("video_chunks")
    .delete()
    .eq("video_id", videoId);

  if (error) {
    throw new Error(`Failed to delete chunks: ${error.message}`);
  }
}
