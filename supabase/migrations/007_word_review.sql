-- 单词复习系统
create table if not exists public.user_word_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lemma text not null,
  repetitions int not null default 0,
  ease_factor numeric not null default 2.5,
  interval_days int not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  status text not null default 'learning' check (status in ('learning', 'reviewing', 'mastered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lemma)
);

alter table public.user_word_reviews enable row level security;
create policy "user_word_reviews_own" on public.user_word_reviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists user_word_reviews_next_idx on public.user_word_reviews (user_id, next_review_at);

-- 每日打卡
create table if not exists public.user_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  word_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

alter table public.user_checkins enable row level security;
create policy "user_checkins_own" on public.user_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists user_checkins_date_idx on public.user_checkins (user_id, checkin_date desc);
