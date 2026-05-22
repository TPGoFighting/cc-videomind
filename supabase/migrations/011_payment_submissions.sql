-- 付款凭证提交表
create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('pro', 'max')),
  transaction_id text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- 管理员审核用索引
create index if not exists payment_submissions_status_idx on public.payment_submissions (status, created_at desc);
create index if not exists payment_submissions_user_idx on public.payment_submissions (user_id, created_at desc);

-- RLS: 用户只能看自己的提交
alter table public.payment_submissions enable row level security;

drop policy if exists payment_submissions_select_own on public.payment_submissions;
create policy payment_submissions_select_own on public.payment_submissions
  for select using (auth.uid() = user_id);

drop policy if exists payment_submissions_insert_own on public.payment_submissions;
create policy payment_submissions_insert_own on public.payment_submissions
  for insert with check (auth.uid() = user_id);
