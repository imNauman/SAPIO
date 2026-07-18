-- ============================================================================
-- Migration 0015: Settings & Account Management Platform
-- ----------------------------------------------------------------------------
-- Adds the user-facing settings surface and the account-deletion state that
-- the Discovery / Recommendation Engine must respect.
--
-- New table:
--   user_settings        — privacy toggles (1:1 with auth.users)
--
-- Reused / extended tables (NO new notification table — we reuse
-- `notification_preferences` from migration 0011):
--   profiles             — adds `discoverable` + `deleted_at` so the
--                          Recommendation Engine can exclude soft-deleted and
--                          non-discoverable users without duplicating filter
--                          logic. These columns are the single source of truth
--                          for "should this profile appear in discovery".
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extend profiles with discovery + deletion state
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists discoverable boolean not null default true;

alter table public.profiles
  add column if not exists deleted_at timestamptz;

create index if not exists profiles_discoverable_idx
  on public.profiles (discoverable);
create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at);

-- ---------------------------------------------------------------------------
-- user_settings — privacy toggles
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  show_age           boolean not null default true,
  show_distance      boolean not null default true,
  show_online_status boolean not null default true,
  show_last_seen     boolean not null default true,
  allow_messages_from_matches_only boolean not null default false,
  discoverable       boolean not null default true,
  hide_verified_badge boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists user_settings_user_id_idx
  on public.user_settings (user_id);

-- Keep updated_at fresh.
drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.user_settings enable row level security;

-- A user can read/write only their own settings row.
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
