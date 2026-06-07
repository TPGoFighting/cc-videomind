-- AI 结果缓存表：存储要点时刻 + 结构化摘要
-- 按 (video_id, result_type, language, mode, theme) 去重

create table if not exists public.ai_results_cache (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  result_type text not null check (result_type in ('moments', 'structured_summary')),
  language text not null default 'zh',
  mode text,
  theme text,
  result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 每个 (video_id, result_type, language, mode, theme) 组合只有一条记录
  -- mode 和 theme 仅对 moments 有意义，summary 时为 null
  unique (video_id, result_type, language, mode, theme)
);

alter table public.ai_results_cache enable row level security;

-- 允许认证用户读取缓存（分析结果不敏感）
create policy "ai_results_cache_read_authenticated"
  on public.ai_results_cache for select
  to authenticated
  using (true);

-- 缓存写入频率低，按时间索引便于清理过期数据
create index if not exists ai_results_cache_created_at_idx
  on public.ai_results_cache (created_at);
