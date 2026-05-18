alter table public.profiles
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_subscription_tier_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_subscription_tier_check
      check (subscription_tier in ('free', 'pro'));
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'profiles'
      and indexname = 'profiles_stripe_customer_id_key'
  ) then
    create unique index profiles_stripe_customer_id_key
      on public.profiles (stripe_customer_id)
      where stripe_customer_id is not null;
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'profiles'
      and indexname = 'profiles_stripe_subscription_id_key'
  ) then
    create unique index profiles_stripe_subscription_id_key
      on public.profiles (stripe_subscription_id)
      where stripe_subscription_id is not null;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'stripe_events'
      and policyname = 'stripe_events_no_client_access'
  ) then
    create policy "stripe_events_no_client_access"
      on public.stripe_events
      for all
      using (false)
      with check (false);
  end if;
end $$;

revoke all on public.video_analyses from anon, authenticated;
revoke all on public.user_videos from anon, authenticated;
revoke all on public.user_notes from anon, authenticated;
revoke all on public.usage_events from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;
