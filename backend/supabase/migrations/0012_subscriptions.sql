-- 0012_subscriptions.sql
-- Premium Membership platform schema.
--
-- Why: Decouples subscription state from business logic. `subscription_plans`
-- defines the tiers (Free/Plus/Gold/Platinum) and prices; `subscription_features`
-- maps each plan to its feature flags (resolved dynamically — never hardcoded in
-- code); `user_subscriptions` records the caller's current subscription. Every
-- authenticated user has exactly one active subscription (Free by default). The
-- architecture is payment-provider agnostic: `platform` + `purchase_token`
-- capture the source (google/apple/stripe) but no gateway is integrated yet.

-- ---------------------------------------------------------------------------
-- subscription_plans: the catalog of tiers.
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tier          text not null check (tier in ('free', 'plus', 'gold', 'platinum')),
  monthly_price numeric not null default 0,
  yearly_price  numeric not null default 0,
  currency      text not null default 'USD',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create unique index if not exists subscription_plans_tier_idx
  on public.subscription_plans (tier);

-- ---------------------------------------------------------------------------
-- subscription_features: per-plan feature flags (key/value).
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_features (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.subscription_plans (id) on delete cascade,
  feature_key  text not null,
  feature_value text not null default 'true'
);

create unique index if not exists subscription_features_plan_key_idx
  on public.subscription_features (plan_id, feature_key);
create index if not exists subscription_features_plan_idx
  on public.subscription_features (plan_id);

-- ---------------------------------------------------------------------------
-- user_subscriptions: the caller's current subscription (one active per user).
-- ---------------------------------------------------------------------------
create table if not exists public.user_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  plan_id        uuid not null references public.subscription_plans (id),
  status         text not null check (status in ('active', 'canceled', 'expired', 'pending')),
  started_at     timestamptz not null default now(),
  expires_at     timestamptz,
  renewal_date   timestamptz,
  platform       text not null default 'free' check (platform in ('free', 'google', 'apple', 'stripe')),
  purchase_token text,
  created_at     timestamptz not null default now()
);

-- Exactly one active subscription per user.
create unique index if not exists user_subscriptions_user_active_idx
  on public.user_subscriptions (user_id, status)
  where status = 'active';

create index if not exists user_subscriptions_user_idx
  on public.user_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security.
--  - Plans + features are world-readable (the catalog is public).
--  - A user may only see/manage their own subscription row.
-- ---------------------------------------------------------------------------
alter table public.subscription_plans enable row level security;
alter table public.subscription_features enable row level security;
alter table public.user_subscriptions enable row level security;

-- Plans: readable by anyone (authenticated or not).
drop policy if exists "subscription_plans_select_public" on public.subscription_plans;
create policy "subscription_plans_select_public"
  on public.subscription_plans for select using (true);

-- Features: readable by anyone (authenticated or not).
drop policy if exists "subscription_features_select_public" on public.subscription_features;
create policy "subscription_features_select_public"
  on public.subscription_features for select using (true);

-- User subscriptions: owner-only select/update/delete. No client insert — the
-- server creates the Free default and (later) payment webhooks create paid ones.
drop policy if exists "user_subscriptions_select_own" on public.user_subscriptions;
create policy "user_subscriptions_select_own"
  on public.user_subscriptions for select
  using (auth.uid () = user_id);

drop policy if exists "user_subscriptions_update_own" on public.user_subscriptions;
create policy "user_subscriptions_update_own"
  on public.user_subscriptions for update
  using (auth.uid () = user_id);

drop policy if exists "user_subscriptions_delete_own" on public.user_subscriptions;
create policy "user_subscriptions_delete_own"
  on public.user_subscriptions for delete
  using (auth.uid () = user_id);

-- ---------------------------------------------------------------------------
-- Seed default plans + features.
-- ---------------------------------------------------------------------------
insert into public.subscription_plans (name, tier, monthly_price, yearly_price, currency, is_active)
values
  ('Free',    'free',    0,    0,    'USD', true),
  ('Plus',    'plus',    9.99, 79.99, 'USD', true),
  ('Gold',    'gold',    19.99, 159.99, 'USD', true),
  ('Platinum','platinum',29.99, 239.99, 'USD', true)
on conflict (tier) do nothing;

-- Feature flags per tier. feature_value is a string ('true'/'false' or a number).
insert into public.subscription_features (plan_id, feature_key, feature_value)
select p.id, f.feature_key, f.feature_value
from public.subscription_plans p
cross join (values
  ('unlimited_swipes', 'false'),
  ('unlimited_rewinds', 'false'),
  ('passport', 'false'),
  ('see_who_liked_you', 'false'),
  ('priority_likes', 'false'),
  ('advanced_filters', 'false'),
  ('read_receipts', 'false')
) as f(feature_key, feature_value)
where p.tier = 'free'
on conflict (plan_id, feature_key) do nothing;

insert into public.subscription_features (plan_id, feature_key, feature_value)
select p.id, f.feature_key, f.feature_value
from public.subscription_plans p
cross join (values
  ('unlimited_swipes', 'true'),
  ('unlimited_rewinds', 'true'),
  ('passport', 'false'),
  ('see_who_liked_you', 'false'),
  ('priority_likes', 'false'),
  ('advanced_filters', 'false'),
  ('read_receipts', 'false')
) as f(feature_key, feature_value)
where p.tier = 'plus'
on conflict (plan_id, feature_key) do nothing;

insert into public.subscription_features (plan_id, feature_key, feature_value)
select p.id, f.feature_key, f.feature_value
from public.subscription_plans p
cross join (values
  ('unlimited_swipes', 'true'),
  ('unlimited_rewinds', 'true'),
  ('passport', 'true'),
  ('see_who_liked_you', 'true'),
  ('priority_likes', 'true'),
  ('advanced_filters', 'false'),
  ('read_receipts', 'false')
) as f(feature_key, feature_value)
where p.tier = 'gold'
on conflict (plan_id, feature_key) do nothing;

insert into public.subscription_features (plan_id, feature_key, feature_value)
select p.id, f.feature_key, feature_value
from public.subscription_plans p
cross join (values
  ('unlimited_swipes', 'true'),
  ('unlimited_rewinds', 'true'),
  ('passport', 'true'),
  ('see_who_liked_you', 'true'),
  ('priority_likes', 'true'),
  ('advanced_filters', 'true'),
  ('read_receipts', 'true')
) as f(feature_key, feature_value)
where p.tier = 'platinum'
on conflict (plan_id, feature_key) do nothing;
