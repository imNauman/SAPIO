-- 0013_boost_superlike.sql
-- Boost + Super Like platform schema.
--
-- Why: Implements the two premium engagement features on top of the existing
-- Subscription Platform. `boost_sessions` records a temporary recommendation
-- score multiplier (only Premium tiers may start one). `super_likes` records a
-- SUPER_LIKE swipe (reuses the swipe engine) so the recipient is notified and
-- the recommendation engine can prioritize them. `feature_usage` enforces daily
-- limits that are resolved dynamically from subscription features (Free users
-- cannot bypass). No payments, ads, or AI ranking are involved.

-- ---------------------------------------------------------------------------
-- Extend the swipe action enum to include SUPER_LIKE (reuses the swipe engine).
-- ---------------------------------------------------------------------------
alter table public.swipes drop constraint if exists swipes_action_check;
alter table public.swipes
  add constraint swipes_action_check
  check (action in ('LIKE', 'PASS', 'SUPER_LIKE'));

-- ---------------------------------------------------------------------------
-- boost_sessions: a temporary recommendation score multiplier.
-- ---------------------------------------------------------------------------
create table if not exists public.boost_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  started_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  boost_multiplier numeric not null default 2.0,
  status          text not null default 'active'
                  check (status in ('active', 'expired', 'canceled')),
  created_at      timestamptz not null default now()
);

-- Active boosts for a user (the engine reads these).
create index if not exists boost_sessions_user_active_idx
  on public.boost_sessions (user_id, status, expires_at);
-- Expire-sweep helper.
create index if not exists boost_sessions_expires_idx
  on public.boost_sessions (expires_at) where status = 'active';

-- ---------------------------------------------------------------------------
-- super_likes: a SUPER_LIKE event (one per from/to pair).
-- ---------------------------------------------------------------------------
create table if not exists public.super_likes (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  to_user_id   uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- A user may super like another user only once.
create unique index if not exists super_likes_unique_pair_idx
  on public.super_likes (from_user_id, to_user_id);
create index if not exists super_likes_to_user_idx
  on public.super_likes (to_user_id);
create index if not exists super_likes_from_user_idx
  on public.super_likes (from_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- feature_usage: per-user daily counters for limited features.
-- ---------------------------------------------------------------------------
create table if not exists public.feature_usage (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  feature_key  text not null,
  daily_limit  integer not null default 0,
  used_today   integer not null default 0,
  last_reset   timestamptz not null default now()
);

create unique index if not exists feature_usage_user_feature_idx
  on public.feature_usage (user_id, feature_key);
create index if not exists feature_usage_user_idx
  on public.feature_usage (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security.
--  - boost_sessions: owner-only.
--  - super_likes: owner can see their own sent; recipients see incoming via a
--    separate policy (to_user_id) so the "who liked you" surface works.
--  - feature_usage: owner-only.
-- ---------------------------------------------------------------------------
alter table public.boost_sessions enable row level security;
alter table public.super_likes enable row level security;
alter table public.feature_usage enable row level security;

drop policy if exists "boost_sessions_select_own" on public.boost_sessions;
create policy "boost_sessions_select_own"
  on public.boost_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "boost_sessions_insert_own" on public.boost_sessions;
create policy "boost_sessions_insert_own"
  on public.boost_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "boost_sessions_update_own" on public.boost_sessions;
create policy "boost_sessions_update_own"
  on public.boost_sessions for update
  using (auth.uid() = user_id);

drop policy if exists "super_likes_select_sent" on public.super_likes;
create policy "super_likes_select_sent"
  on public.super_likes for select
  using (auth.uid() = from_user_id);

drop policy if exists "super_likes_select_received" on public.super_likes;
create policy "super_likes_select_received"
  on public.super_likes for select
  using (auth.uid() = to_user_id);

drop policy if exists "super_likes_insert_own" on public.super_likes;
create policy "super_likes_insert_own"
  on public.super_likes for insert
  with check (auth.uid() = from_user_id);

drop policy if exists "feature_usage_select_own" on public.feature_usage;
create policy "feature_usage_select_own"
  on public.feature_usage for select
  using (auth.uid() = user_id);

drop policy if exists "feature_usage_insert_own" on public.feature_usage;
create policy "feature_usage_insert_own"
  on public.feature_usage for insert
  with check (auth.uid() = user_id);

drop policy if exists "feature_usage_update_own" on public.feature_usage;
create policy "feature_usage_update_own"
  on public.feature_usage for update
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed subscription feature flags for Boost + Super Like.
--  - boost: only paid tiers (plus/gold/platinum). Free = false.
--  - super_like: only paid tiers. Free = false.
--  - super_like_daily_limit: numeric daily cap (Free = 0, paid tiers get some).
-- ---------------------------------------------------------------------------
insert into public.subscription_features (plan_id, feature_key, feature_value)
select p.id, f.feature_key, f.feature_value
from public.subscription_plans p
cross join (values
  ('boost', 'false'),
  ('super_like', 'false'),
  ('super_like_daily_limit', '0')
) as f(feature_key, feature_value)
where p.tier = 'free'
on conflict (plan_id, feature_key) do nothing;

insert into public.subscription_features (plan_id, feature_key, feature_value)
select p.id, f.feature_key, f.feature_value
from public.subscription_plans p
cross join (values
  ('boost', 'true'),
  ('super_like', 'true'),
  ('super_like_daily_limit', '5')
) as f(feature_key, feature_value)
where p.tier = 'plus'
on conflict (plan_id, feature_key) do nothing;

insert into public.subscription_features (plan_id, feature_key, feature_value)
select p.id, f.feature_key, f.feature_value
from public.subscription_plans p
cross join (values
  ('boost', 'true'),
  ('super_like', 'true'),
  ('super_like_daily_limit', '5')
) as f(feature_key, feature_value)
where p.tier = 'gold'
on conflict (plan_id, feature_key) do nothing;

insert into public.subscription_features (plan_id, feature_key, feature_value)
select p.id, f.feature_key, f.feature_value
from public.subscription_plans p
cross join (values
  ('boost', 'true'),
  ('super_like', 'true'),
  ('super_like_daily_limit', '5')
) as f(feature_key, feature_value)
where p.tier = 'platinum'
on conflict (plan_id, feature_key) do nothing;

-- ---------------------------------------------------------------------------
-- Extend the notifications.type check constraint to include the new events.
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'new_match',
      'new_message',
      'verification_approved',
      'verification_rejected',
      'report_resolved',
      'super_like_received',
      'boost_started'
    )
  );
