create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_analyses (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique,
  metadata jsonb,
  transcript jsonb,
  analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null references public.video_analyses(video_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);

create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null references public.video_analyses(video_id) on delete cascade,
  body text not null check (char_length(body) <= 10000),
  timestamp_seconds numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  video_id text,
  event_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.video_analyses enable row level security;
alter table public.user_videos enable row level security;
alter table public.user_notes enable row level security;
alter table public.usage_events enable row level security;
alter table public.stripe_events enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "video_analyses_read_authenticated" on public.video_analyses for select to authenticated using (true);

create policy "user_videos_own" on public.user_videos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_notes_own" on public.user_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "usage_events_own_read" on public.usage_events for select using (auth.uid() = user_id);

create index if not exists usage_events_user_month_idx on public.usage_events (user_id, event_type, created_at);
create index if not exists user_notes_user_video_idx on public.user_notes (user_id, video_id, updated_at desc);
