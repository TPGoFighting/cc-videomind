CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE video_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  segment_start INTEGER NOT NULL,
  segment_end INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_id, chunk_index)
);

CREATE INDEX idx_video_chunks_video_id ON video_chunks(video_id);
CREATE INDEX idx_video_chunks_embedding ON video_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE video_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chunks" ON video_chunks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert chunks" ON video_chunks FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION match_video_chunks(
  p_video_id TEXT,
  p_query_embedding vector(1536),
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  chunk_index INTEGER,
  segment_start INTEGER,
  segment_end INTEGER,
  text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id,
    vc.chunk_index,
    vc.segment_start,
    vc.segment_end,
    vc.text,
    1 - (vc.embedding <=> p_query_embedding) AS similarity
  FROM video_chunks vc
  WHERE vc.video_id = p_video_id
  ORDER BY vc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;
