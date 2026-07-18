-- SAPIO — Recommendation Engine support tables
-- 1) user_preferences: per-user discovery filters (age, distance, gender,
--    relationship goal, verified/online/inactive toggles, languages).
-- 2) blocks: mutual hide between two users (excluded from recommendations).
-- 3) reports: moderation reports (reported users excluded from recommendations).
-- Run in the Supabase SQL editor or via the Supabase CLI migration runner.

-- ---------------------------------------------------------------------------
-- 1. user_preferences
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  minimum_age integer not null default 18,
  maximum_age integer not null default 99,
  maximum_distance_km integer not null default 100,
  interested_in text[] not null default '{}',
  relationship_goal text,
  show_verified_only boolean not null default false,
  show_online_only boolean not null default false,
  hide_inactive_users boolean not null default true,
  preferred_languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_preferences_user_id_idx
  on public.user_preferences (user_id);

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. blocks (mutual hide)
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_two_distinct_users check (blocker_user_id <> blocked_user_id)
);

-- A user may block another user only once (either direction).
create unique index if not exists blocks_unique_pair_idx
  on public.blocks (least(blocker_user_id, blocked_user_id), greatest(blocker_user_id, blocked_user_id));

create index if not exists blocks_blocker_idx on public.blocks (blocker_user_id);
create index if not exists blocks_blocked_idx on public.blocks (blocked_user_id);

-- ---------------------------------------------------------------------------
-- 3. reports (moderation)
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint reports_two_distinct_users check (reporter_user_id <> reported_user_id)
);

create index if not exists reports_reporter_idx on public.reports (reporter_user_id);
create index if not exists reports_reported_idx on public.reports (reported_user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.user_preferences enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- user_preferences: a user manages only their own row.
create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);
create policy "Users can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- blocks: a user sees/creates only their own blocks.
create policy "Users can view their own blocks"
  on public.blocks for select
  using (auth.uid() = blocker_user_id);
create policy "Users can insert their own blocks"
  on public.blocks for insert
  with check (auth.uid() = blocker_user_id);
create policy "Users can delete their own blocks"
  on public.blocks for delete
  using (auth.uid() = blocker_user_id);

-- reports: a user sees/creates only their own reports.
create policy "Users can view their own reports"
  on public.reports for select
  using (auth.uid() = reporter_user_id);
create policy "Users can insert their own reports"
  on public.reports for insert
  with check (auth.uid() = reporter_user_id);
