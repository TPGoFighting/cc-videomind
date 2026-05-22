-- 012: Per-user AI config overrides
-- 每位用户可覆盖全局 AI 配置（provider / api_key / base_url / model）

CREATE TABLE IF NOT EXISTS public.user_ai_settings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS user_ai_settings_user_idx ON public.user_ai_settings (user_id);

-- RLS: 用户只能读写自己的配置覆盖
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_ai_settings FROM anon, authenticated;

DROP POLICY IF EXISTS user_ai_settings_select_own ON public.user_ai_settings;
CREATE POLICY user_ai_settings_select_own ON public.user_ai_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_ai_settings_insert_own ON public.user_ai_settings;
CREATE POLICY user_ai_settings_insert_own ON public.user_ai_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_ai_settings_update_own ON public.user_ai_settings;
CREATE POLICY user_ai_settings_update_own ON public.user_ai_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_ai_settings_delete_own ON public.user_ai_settings;
CREATE POLICY user_ai_settings_delete_own ON public.user_ai_settings
  FOR DELETE USING (auth.uid() = user_id);
