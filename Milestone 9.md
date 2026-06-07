Milestone 9: Add Supabase Auth, database schema, and video analysis caching.

Create Supabase migration files for:
profiles:
- id uuid primary key references auth.users(id)
- email text
- plan text default 'free'
- monthly_video_limit integer default 3
- monthly_video_used integer default 0
- billing_period_start timestamptz
- billing_period_end timestamptz
- stripe_customer_id text
- stripe_subscription_id text
- created_at timestamptz
- updated_at timestamptz

video_analyses:
- id uuid primary key
- youtube_id text unique not null
- video_info jsonb
- transcript jsonb
- summary jsonb
- highlights jsonb
- suggested_questions jsonb
- created_at timestamptz
- updated_at timestamptz

user_videos:
- id uuid primary key
- user_id uuid references auth.users(id)
- video_analysis_id uuid references video_analyses(id)
- is_favorite boolean default false
- created_at timestamptz

user_notes:
- id uuid primary key
- user_id uuid references auth.users(id)
- video_analysis_id uuid references video_analyses(id)
- content text
- source_type text
- source_timestamp numeric
- created_at timestamptz
- updated_at timestamptz

usage_events:
- id uuid primary key
- user_id uuid references auth.users(id)
- youtube_id text
- event_type text
- credit_consumed boolean default false
- created_at timestamptz

stripe_events:
- id uuid primary key
- stripe_event_id text unique
- event_type text
- processed_at timestamptz

Implement:
- lib/supabase/client.ts
- lib/supabase/server.ts
- lib/usage/limits.ts
- app/api/check-video-cache/route.ts
- Update video-analysis flow to:
  1. Check cache by youtube_id.
  2. If cache exists, return cached result without consuming credits.
  3. If no cache, check user quota.
  4. Generate analysis.
  5. Store result.
  6. Consume credit only after success.

Acceptance criteria:
- Cached analysis is reused.
- Failed generation does not consume quota.
- Free user limit is enforced server-side.
- Typecheck and lint pass.