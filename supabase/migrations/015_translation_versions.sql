CREATE TABLE video_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id TEXT NOT NULL,
  language TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  segments JSONB NOT NULL,
  provider TEXT,
  model TEXT,
  quality_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(video_id, language, version)
);

CREATE INDEX idx_video_translations_lookup ON video_translations(video_id, language);

ALTER TABLE video_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations" ON video_translations
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert translations" ON video_translations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
