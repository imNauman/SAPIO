-- SAPIO — Discovery Filters & Location Platform
-- 1) discovery_preferences: the CANONICAL discovery-filter table. The
--    Recommendation Engine reads/writes this table (it replaces the legacy
--    user_preferences as the single source of truth for discovery filters).
-- 2) profiles.location_updated_at: timestamp of the last location write, used
--    by the Location API and future geo optimizations.
-- Run in the Supabase SQL editor or via the Supabase CLI migration runner.

-- ---------------------------------------------------------------------------
-- 1. discovery_preferences
-- ---------------------------------------------------------------------------
create table if not exists public.discovery_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  minimum_age integer not null default 18,
  maximum_age integer not null default 99,
  maximum_distance_km integer not null default 50,
  show_me_gender text[] not null default '{}',
  relationship_goals text,
  verified_only boolean not null default false,
  hide_inactive_profiles boolean not null default true,
  -- Engine-compat fields kept so the Recommendation Engine contract is
  -- unchanged (no engine redesign): online-only filter + preferred languages.
  show_online_only boolean not null default false,
  preferred_languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_updated timestamptz not null default now()
);

create index if not exists discovery_preferences_user_id_idx
  on public.discovery_preferences (user_id);

-- Keep last_updated fresh (reuses the set_updated_at() helper from 0007).
drop trigger if exists discovery_preferences_set_updated_at on public.discovery_preferences;
create trigger discovery_preferences_set_updated_at
  before update on public.discovery_preferences
  for each row execute function public.set_updated_at();

-- One-time backfill from the legacy user_preferences so existing users keep
-- their filters. Column names differ; map them across.
insert into public.discovery_preferences (
  user_id, minimum_age, maximum_age, maximum_distance_km,
  show_me_gender, relationship_goals, verified_only, hide_inactive_profiles,
  show_online_only, preferred_languages, created_at, last_updated
)
select
  user_id, minimum_age, maximum_age, maximum_distance_km,
  interested_in, relationship_goal, show_verified_only, hide_inactive_users,
  show_online_only, preferred_languages, created_at, updated_at
from public.user_preferences
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. profiles.location_updated_at
-- ---------------------------------------------------------------------------
-- latitude / longitude / city / country already exist on profiles; only the
-- timestamp is genuinely new.
alter table public.profiles
  add column if not exists location_updated_at timestamptz;

-- Indexes to support geo radius queries (no PostGIS).
create index if not exists profiles_latitude_idx on public.profiles (latitude);
create index if not exists profiles_longitude_idx on public.profiles (longitude);
create index if not exists profiles_location_updated_at_idx
  on public.profiles (location_updated_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.discovery_preferences enable row level security;

create policy "Users can view their own discovery preferences"
  on public.discovery_preferences for select
  using (auth.uid() = user_id);
create policy "Users can insert their own discovery preferences"
  on public.discovery_preferences for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own discovery preferences"
  on public.discovery_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
