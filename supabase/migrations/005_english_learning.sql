-- 005: 英语学习增强功能 — 词义缓存 + 生词本 + 摘抄本

-- 1. 词义缓存表（全局共享，AI 批量生成后缓存）
CREATE TABLE IF NOT EXISTS public.word_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lemma TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en')),
  phonetic TEXT,
  part_of_speech TEXT,
  definition_zh TEXT NOT NULL,
  definition_en TEXT,
  example_en TEXT,
  example_zh TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS word_definitions_lemma_idx
  ON public.word_definitions (lemma);

CREATE INDEX IF NOT EXISTS word_definitions_created_at_idx
  ON public.word_definitions (created_at);

ALTER TABLE public.word_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "word_definitions_read_authenticated"
  ON public.word_definitions FOR SELECT
  TO authenticated
  USING (true);

-- 2. 用户生词本
CREATE TABLE IF NOT EXISTS public.user_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.word_definitions(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);

ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_vocabulary_own"
  ON public.user_vocabulary FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_vocabulary_user_idx
  ON public.user_vocabulary (user_id, created_at DESC);

-- 3. 用户摘抄本
CREATE TABLE IF NOT EXISTS public.user_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  text_en TEXT NOT NULL CHECK (char_length(text_en) > 0),
  text_zh TEXT,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  notes TEXT CHECK (char_length(notes) <= 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_quotes_own"
  ON public.user_quotes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_quotes_user_video_idx
  ON public.user_quotes (user_id, video_id, created_at DESC);

-- 4. 回收默认权限（遵循 002 迁移模式）
REVOKE ALL ON public.word_definitions FROM anon, authenticated;
REVOKE ALL ON public.user_vocabulary FROM anon, authenticated;
REVOKE ALL ON public.user_quotes FROM anon, authenticated;
